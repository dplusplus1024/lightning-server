import path from 'path';
import { promises as fs } from 'fs';
import * as nostr from 'nostr-tools';
import crypto from 'crypto';
import 'websocket-polyfill';
import bolt11 from 'bolt11';
import { NextResponse } from 'next/server';
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const relays = [
  "wss://relay.damus.io",
  "wss://nostr.mutinywallet.com",
  "wss://relay.nostr.band",
  "wss://nos.lol",
  "wss://nostr.fmt.wiz.biz",
  "wss://relay.nostr.bg",
  "wss://nostr.oxtr.dev",
];

const ZAP_TIMEOUT = 300000; // time to wait for zap to be paid - 5 minutes in milliseconds
let startTime, preimage;

const loaderOptions = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
};
const packageDefinition = protoLoader.loadSync(
  path.join(process.cwd(), 'files/lightning.proto'),
  loaderOptions
);
const lnrpc = grpc.loadPackageDefinition(packageDefinition).lnrpc;
const lndCert = null; // set to null if using Voltage
const sslCreds = grpc.credentials.createSsl(lndCert);
const macaroonCreds = grpc.credentials.createFromMetadataGenerator(function (args,callback) {
  let metadata = new grpc.Metadata();
  metadata.add('macaroon', process.env.INVOICE_MACAROON);
  callback(null, metadata);
});
const creds = grpc.credentials.combineChannelCredentials(sslCreds, macaroonCreds);
const lightning = new lnrpc.Lightning(process.env.GRPC_HOST, creds);

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// get bolt 11 invoice from node in amount specified
function createInvoice(user, address, amount, descriptionHash, comment) {
  comment = comment ? comment.slice(0, 64) : "";
  comment = comment ? `Sent to: ${address} | Comment: ${comment}` : `Sent to: ${address} | `;
  
  let requestInvoice = {
    memo: comment,
    description_hash: Buffer.from(descriptionHash, 'hex'),
    value_msat: amount, // in millisats
  }
  // create invoice
  return new Promise(function(resolve, reject) {
    lightning.addInvoice(requestInvoice, function(err, response) {
       resolve(response.payment_request);
    });
 });
}

// using this invoice as a data store for nostr zaps... sorry lND!
function createDataInvoice(data) {
  let memo = {};
  data = JSON.parse(data);
  memo.pubkey = data.pubkey;
  memo.content = data.content;
  memo.event = data.tags.find(tag => tag[0] === 'e')?.[1];

  let requestInvoice = {
    memo: JSON.stringify(memo),
    r_preimage: preimage,
    value_msat: 0, // in millisats
  }

  const r_hash = crypto.createHash('sha256').update(preimage).digest();

  lightning.addInvoice(requestInvoice, function(err, response) {
    // console.log(response);
  });
}

function createNostrInvoice(amount, descriptionHash) {
  let requestInvoice = {
    memo: "Zap!",
    description_hash: Buffer.from(descriptionHash, 'hex'),
    value_msat: amount, // in millisats
  }

  return new Promise(function(resolve, reject) {
    lightning.addInvoice(requestInvoice, function(err, response) {
       // create a new invoice linked to this one for a data store
       // to link them, we'll use this invoice's hash as its preimage
       preimage = response.r_hash;
       resolve(response.payment_request);
    });
 });
}

async function getNostrInvoice(amount, description) {
  const descriptionHash = sha256(description);
  return await createNostrInvoice(amount, descriptionHash);
}

function logTime(message) {
  console.log(`${message} Time elapsed: ${new Date().getTime() - startTime} milliseconds.`);
}

function getStatus(hash) {
  let request = {
    r_hash_str: hash
  };

  return new Promise(function(resolve, reject) {
    lightning.lookupInvoice(request, function(err, response) {
      if (response) {
        resolve(response?.state == 'SETTLED');
      }
      else
        resolve(false);
    });
  });
}

async function zapReceipt(data) {
  const note = JSON.parse(data.description);
  let e = note.tags.find(tag => tag[0] === 'e')?.[1];
  let p = note.tags.find(tag => tag[0] === 'p')?.[1];

  if (!p) {
    return;
  }
  let zap = {
    content: '', // leave this blank
    kind: 9735,
    pubkey: note.pubkey,
    created_at: Math.floor(Date.now() / 1000), // time of invoice paid
    tags: [
      ["bolt11", data.bolt11],
      ["description", data.description],
      ["p", p],
    ]
  };
  if (e) {
    zap.tags[zap.tags.length] = ["e", e];
  }
  zap.id = nostr.getEventHash(zap);
  zap.sig = nostr.getSignature(zap, process.env.NOSTR_PRIVATE_KEY);
  const signedEvent = nostr.finishEvent(zap, process.env.NOSTR_PRIVATE_KEY);

  let isPublished = false;
  for (let relayUrl of relays) {
    try {
      let relay = nostr.relayInit(relayUrl);
      await relay.connect();
      await relay.publish(signedEvent);
      console.log(`Published to ${relayUrl}`);
      isPublished = true;
      relay.close();
    } catch (error) {
      console.error(`Failed to publish to ${relayUrl}:`, error);
    }
  }
  if (!isPublished)
    console.log(`Could not publish note to any relay. :(`);
}

function pause(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getHash(invoice) {
  try {
    const decoded = bolt11.decode(invoice);
    const paymentHash = decoded.tags.find(tag => tag.tagName === 'payment_hash').data;
    return paymentHash;
  } catch (error) {
    console.error('Error decoding invoice:', error);
    return null;
  }
}

async function checkZap(bolt11, zap) {
  let hash = getHash(bolt11);
  console.log("New invoice generated. Waiting for payment...");
  pause(1000);
  // check status of invoice here... may want to move this to notifier.js...
  while (await getStatus(hash) == false) {
     pause(1000);
     const currentTime = new Date().getTime();
     if (currentTime - startTime > ZAP_TIMEOUT) {
      console.log("Zap not paid in time.");
      return false; // check for five minutes and then stop...
    }
  }
  // successful zap! invoice settled.
  await zapReceipt({ bolt11: bolt11, description: zap });
  logTime("Nostr zap receipt success!");
  return true;
}

export async function GET(req, { params }) {
  startTime = new Date().getTime();

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  console.log("Welcome to getInvoice.js");

  let lnurl = {};
  const url = new URL(req.url);
  const amountParam = url.searchParams.get('amount');
  if (amountParam === null || amountParam.trim() === '')
    return NextResponse.json({ message: "No amount was provided." }, { headers });
  const amount = Number(amountParam);
  if (isNaN(amount))
    return NextResponse.json({ message: "Invalid amount provided." }, { headers });

  const zap = url.searchParams.get('nostr');
  // it's a nostr zap
  if (zap) {
    // get invoice
    let bolt11 = await getNostrInvoice(amount, zap);

    // using my node as a data store... sorry LND! and we don't need to await this...
    createDataInvoice(zap);

    lnurl.pr = bolt11;
    lnurl.routes = [];
    logTime("Created an invoice for a nostr zap.");

    // give them 5 minutes to pay the invoice, polling our node every second...
    checkZap(bolt11, zap);
    return NextResponse.json(lnurl, { headers });
  }

  // not a nostr zap, just a regular invoice
  let user = params.user.toLowerCase() || "none";
  let comment = url.searchParams.get('comment');

  var meta;
  switch (user) {
    case "glitch":
      meta = "G / L / I / T / C / H";
      break;
    case "bazaar":
      meta = "Bitcoin Bazaar";
      break;
    default:
      meta = "Pay to Island Bitcoin";
  }

  user = encodeURIComponent(user.toLowerCase());
  const address = `${user}@${process.env.DOMAIN}`;
  const memo = JSON.stringify([["text/plain", meta], ["text/identifier", `${address}`]]);
  const hash = sha256(memo);

  lnurl.pr = await createInvoice(user, address, amount, hash, comment);
  lnurl.routes = [];
  logTime("Invoice creation success!");
  return NextResponse.json(lnurl, { headers });
}
