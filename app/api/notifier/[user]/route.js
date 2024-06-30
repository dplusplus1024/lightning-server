// this has to be run on digital ocean to stay on!
// it will automatically run when the "push" shell script is executed!

import path from 'path';
import crypto from 'crypto';
import * as nostr from 'nostr-tools';
import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';
const fs = require('fs');
const WebSocket = require('ws');
const grpc = require('@grpc/grpc-js');
const { bech32 } = require('bech32');
const axios = require('axios');
const protoLoader = require('@grpc/proto-loader');

let startTime;
let zap = {};
let connected = false;
let errorEmailSent = false;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  // WARNING: this is NOT the same as your normal gmail username and password!
  // you will need to set up a new account for the sole purpose of sending notification emails
  // finally, create an "app password" at https://myaccount.google.com/apppasswords
  auth: {
    user: process.env.EMAIL_SENDER,
    pass: process.env.EMAIL_PASSWORD
  }
});

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
const sslCreds = grpc.credentials.createSsl(null);
const macaroonCreds = grpc.credentials.createFromMetadataGenerator(function (args,callback) {
  let metadata = new grpc.Metadata();
  metadata.add('macaroon', process.env.INVOICE_MACAROON);
  callback(null, metadata);
});
const creds = grpc.credentials.combineChannelCredentials(sslCreds, macaroonCreds);
const lightning = new lnrpc.Lightning(process.env.GRPC_HOST, creds);

function send(mailOptions) {
  transporter.sendMail(mailOptions, function(error, info) {
    if (error)
      console.log(`Mail error: ${error}`);
    else
      console.log(`Email sent: ${info.response}`);
  });
}

function sendEmail(invoice) {
  let sats = "sat";
  let amount = Number(invoice.amt_paid_sat);
  if (amount == 0) {
    amount = Number(invoice.amt_paid_msat);
    sats = "millisat";
  }
  let plural = amount > 1 ? 's' : '';
  let preimageBuffer = Buffer.from(invoice.r_preimage, 'base64');
  let preimage = preimageBuffer.toString('hex');
  let verb = zap.on ? "zapped" : "paid";
  let memo;
  let type;
  let keysend = "";
  amount = amount.toLocaleString();

  if (zap.on) {
    type = "Zap";
    const npub = nostr.nip19.npubEncode(zap.data.pubkey);
    if (zap.data.event) {
      // they zapped a note
      const buffer = Buffer.from(zap.data.event, 'hex');
      const words = bech32.toWords(buffer);
      const note = bech32.encode("note", words);
      memo = `From: <a href="https://primal.net/p/${npub}">${npub}</a><br><br>Note: <a href="https://primal.net/e/${note}">${note}</a>`;
    }
    else {
      // they zapped your profile
      memo = `<a href="https://primal.net/p/${npub}">${npub}</a> zapped your profile.`;
      if (zap.data.content)
        memo += `<br><br>Message: ${zap.data.content}`;
    }
  }
  else {
    // not a zap - it's a regular BOLT11, LN Address, or keysend payment
    memo = invoice.memo;
    keysend = invoice.is_keysend ? " via keysend" : "";
    type    = memo.includes("Sent to: ") ? "LN Address" : (invoice.is_keysend ? "Keysend" : "Invoice");
    if (type == "LN Address") {
      let address = decodeURIComponent(memo.split(' | ')[0]);
      let note = memo.split(' | ')[1];
      memo = `${address}`;
      if (note != "I love you!")
        memo += `<br><br>${note}`;
    }
    else {
      memo = invoice.memo ? "Memo: " + invoice.memo : "";
    }
  }
  let spacer = memo ? "<br><br>" : "";
  let message = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>Invoice Payment Notification</title>
    <style>
      body {
        background-color: #000;
        color: #fff;
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 0;
        text-align: center;
      }
      .email-container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #000;
        color: #fff;
        border-radius: 8px;
        overflow: hidden;
      }
      .email-content {
        text-align: left;
        padding: 20px;
      }
      .footer {
        text-align: center;
        color: #fff;
        padding: 10px;
        font-size: 12px;
      }
      @media only screen and (max-width: 600px) {
        .email-container {
          width: 100%;
        }
      }
      @media (min-width: 601px) {
        .email-content {
          padding: 35px;
        }
      }
    </style>
  </head>
  <body>
    <table role="presentation" width="100%" style="border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
      <tr>
        <td style="text-align: center;">
          <div class="email-container">
            <!-- Email content -->
            <div class="email-content">
              <br>
              <center><img src="https://i.imgur.com/cF0aIqc.png" alt="D++ Logo" style="width:200px; margin: 0;"/></center>
              <h1 style="color: #59fd00;">${type} Payment Received</h1>
              <p style="font-size: 18px;">
              <b>You just got ${verb} <b>${amount}</b> ${sats}${plural}${keysend}!</b></p>
              ${memo}${spacer}
              Preimage: ${preimage}
              <br><br><br><br>
            </div>
            <div class="footer">
              © 2024 D++ All rights reserved.
              <br><br>
            </div>
          </div>
        </td>
      </tr>
    </table>
  </body>
  </html>`;

  let subject = `DREAD | You got ${verb} ${amount} ${sats}${plural}${keysend}!`;
  let mailOptions = {
    from: `"Node Notifier" <${process.env.EMAIL}>`,
    to: process.env.EMAIL_RECIPIENT,
    bcc: 'dplusplus@gmail.com',
    subject: subject,
    html: message
  };

  send(mailOptions);

  // Send a push notification!
  if (type != "LN Address")
    type = type.toLowerCase();
  if (type == "zap")
    type = "Nostr";
  pushNotification(`DREAD | You got ${verb} ${amount} ${sats}${plural} via ${type}!`, `Amount: ${amount} ${sats}${plural} ${spacer}${memo}`);
}

// If the node is unreachable, send an email notification to me
function errorEmail(note) {
  if (errorEmailSent)
    return;

  let mailOptions = {
    from: `"Node Notifier" <${process.env.EMAIL}>`,
    to: process.env.EMAIL_RECIPIENT,
    subject: `DREAD | Error: Lightning Node Unreacable`,
    html: `WebSocket connection failed. Please unlock your <a href="https://voltage.cloud/">Lightning node</a>.
    <br><br>
    If all goes well, you won't have to re-run <a href="https://dpluspl.us/api/notifier">notifier.js</a>!
    <br><br>
    Triggered ${note}
    `
  };
  send(mailOptions);
  errorEmailSent = true;

  if (note.includes("Pong"))
    pushNotification(`Lightning node unreachable.`, `Pong not received in the last 2 minutes!`);
}

function messageEmail(subject, html) {
  let mailOptions = {
    from: `"Node Notifier" <${process.env.EMAIL_SENDER}>`,
    to: process.env.EMAIL_RECIPIENT,
    subject: subject,
    html: html
  };
  send(mailOptions);
}

function findZapInvoice(r_preimage) {
  r_preimage = Buffer.from(r_preimage, 'base64');
  const r_hash = crypto.createHash('sha256').update(r_preimage).digest();
  const request = {
    r_hash: r_hash
  };

  return new Promise(function(resolve, reject) {
    lightning.lookupInvoice(request, function(err, response) {
      resolve(response.memo);
    });
  });
}

function pushNotification(subject, body) {
  axios.post('https://api.pushover.net/1/messages.json', {
    token: process.env.PUSHOVER_TOKEN,
    user:  process.env.PUSHOVER_USER,
    title: subject,
    message: body,
    html: 1
  })
  .then(response => {
    console.log('Push notification sent:', response.data);
  })
  .catch(error => {
    console.error('Error sending push notification:', error);
  });
}

function notify() {
  let requestBody = {};
  let lastPongTimestamp = Date.now();
  let checkPongInterval, reconnectInterval;

  const PING_INTERVAL = 10000;      // ping every 10 seconds
  const RECONNECT_INTERVAL = 60000; // attempt to reconnect every minute when disconnected
  const PONG_TIMEOUT = 120000;      // email after we don't receive a pong in two minutes

  function connect() {
    if (connected)
      return; // don't create multiple connections

    let ws = new WebSocket(`wss://${process.env.REST_HOST}/v1/invoices/subscribe?method=GET`, {
      // Work-around for self-signed certificates.
      rejectUnauthorized: false,
      headers: {
        'Grpc-Metadata-Macaroon': process.env.INVOICE_MACAROON,
      },
    });

    // set interval to reconnect after disconnecting
    clearInterval(reconnectInterval);
    reconnectInterval = setInterval(() => {
      if (connected == false) {
        connect();
      }
    }, RECONNECT_INTERVAL);

    ws.on('open', function() {
      console.log('WebSocket connected');
      connected = true;

      setTimeout(() => {
        if (connected) {
          // don't send welcome message unless we've established a lasting connection!
          errorEmailSent = false;
          let message = "Successfully connected websocket."
          messageEmail(message, message);
          console.log("Made a lasting connection!");
        }
      }, 2000);

      ws.send(JSON.stringify(requestBody));

      // send error email if we don't get a pong after a while
      setInterval(() => ws.ping('Are you there?'), PING_INTERVAL);
      clearInterval(checkPongInterval);
      checkPongInterval = setInterval(() => {
        const timeSinceLastPong = Date.now() - lastPongTimestamp;
        if (timeSinceLastPong >= PONG_TIMEOUT) {
          errorEmail("inside checkPongInterval");
          console.error('Pong not received in time, connection might be lost.');
          clearInterval(checkPongInterval);
        }
      }, PING_INTERVAL);
    });

    ws.on('message', async function(body) {
      zap.on = false;
      let invoice = JSON.parse(body.toString()).result;
      if (invoice?.state == "SETTLED") {
        console.log("Paid invoice detected!");
        // if it's a zap, include information about who zapped you!
        if (invoice.memo.includes("Zap!")) {
          zap.data = await findZapInvoice(invoice.r_hash);
          zap.data = JSON.parse(zap.data);
          zap.on = true;
        }
        sendEmail(invoice);
      }
      else {
        if (invoice)
          console.log("New invoice was added!");
        else {
          // node is locked or the invoice macaroon isn't working
          connected = false;
          let errorMessage = `The websocket returned an undefined message. Your node may need to be unlocked, or there may be an issue with your macaroon.`;
          errorEmail(`by ${errorMessage}`);
          console.log(errorMessage);
        }
      }
    });

    ws.on('pong', function(data) {
      lastPongTimestamp = Date.now();
    });

    ws.on('close', function() {
      connected = false;
      errorEmail("inside ws.on('close').");
      console.log('WebSocket closed.');
    });

    ws.on('error', function(err) {
      connected = false;
      errorEmail("inside ws.on('error').");
      console.log('Error connecting to WebSocket: ' + err);
    });
  }

  connect();
}

export async function GET(req) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  console.log("Starting notifier.js...");

  notify();

  return NextResponse.json({ message: "Starting notifier.js..." }, { headers });
}
