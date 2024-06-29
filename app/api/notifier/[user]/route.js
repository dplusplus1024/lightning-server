// this has to be run on digital ocean to stay on!
// it will automatically run when the "push" shell script is executed

import path from 'path';
import crypto from 'crypto';
const WebSocket = require('ws');
const fs = require('fs');
import * as nostr from 'nostr-tools';
import nodemailer from 'nodemailer';
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { bech32 } = require('bech32');
const axios = require('axios');
import { NextResponse } from 'next/server';
const PUSH_TOKEN = 'aj7s6xcw4cz4wevqpdjdymogquw75c';
const PUSH_USER  = 'uwvfbh6kp2tomsi3pnitzskfozeo93';

var startTime;
var zap = {};
var connected = false;
var errorEmailSent = false;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: "dppnotifier@gmail.com",
    pass: "dacr lvac etrq yiln"
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
// Dread's invoice macaroon
const invMacaroon = "0201036c6e64025e030a10dcd195aa075eb70ba5dae8121f8cf3331207383635383234331a160a0761646472657373120472656164120577726974651a170a08696e766f69636573120472656164120577726974651a0f0a076f6e636861696e120472656164000006207df91761969da0945f372847d4d1b4625bdc13e0eef5faa69edcb54a53b7ac29";
// const invMacaroon = "0201036c6e640229030a10b68e2355c045048923a6f18b3e919e911201301a110a08696e766f6963657312057772697465000006206de6b449ca08f2ee590ab12557a606d118c3fe5dd9eef429510da7512e25dc15";
// D's invoice macaroon
// const invMacaroon = "0201036C6E640258030A1076C83CCD62C8FEE0EF7D7E107DDC62FD1201301A160A0761646472657373120472656164120577726974651A170A08696E766F69636573120472656164120577726974651A0F0A076F6E636861696E12047265616400000620C62E99D6B11CB72385CD10B681E8C3CF8DB4DD55A6727FDC0D085384E4672014";

const macaroonCreds = grpc.credentials.createFromMetadataGenerator(function (args,callback) {
  let metadata = new grpc.Metadata();
  metadata.add('macaroon', invMacaroon);
  callback(null, metadata);
});
const creds = grpc.credentials.combineChannelCredentials(sslCreds, macaroonCreds);
const grpcHost = "one-love-bitcoin.m.voltageapp.io:10009";
const restHost = "one-love-bitcoin.m.voltageapp.io:8080";
// const grpcHost = "dplusplus.m.voltageapp.io:10009";
// const restHost = "dplusplus.m.voltageapp.io:8080";
const lightning = new lnrpc.Lightning(grpcHost, creds);

function send(mailOptions) {
  transporter.sendMail(mailOptions, function(error, info) {
    if (error) {
      console.log("error: ");
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
}

// This is for the halving ticket confirmation email
function sendHalvingEmail(name, email, preimage, amount) {
  // preimage = preimage.substring(0,32) + "<br>" + preimage.substring(32, 64);
  // preimage = preimage.substring(0,16) + "<div class='hide-on-desktop'><br></div>" + preimage.substring(16,48) + "<div class='hide-on-desktop'><br></div>" + preimage.substring(48,64);
  email = email || 'dplusplus@gmail.com';

  let message = `
  <head>
    <meta name="color-scheme" content="dark">
    <meta name="supported-color-schemes" content="dark">
    <style>
    @media(min-width:501px) {
      .hide-on-desktop {
        display:none;
      }
    }
    </style>
  </head>
  <center>
  <body style="background-color: black">
    <div style="background-color: black; padding: 20px;">
      <div style="background-color: #f0f0f0; color: black; padding: 20px; border-radius: 10px; font-size: 16px; font-family: 'Times New Roman', serif;">
        <p><img src=https://i.imgur.com/2Jw1Ymw.jpg width=155></p>
        <p>Dear ${name},</p>
        <p>You're going to <b>The Halving Experience</b>.</p>
        <p style="font-size: 30px; color: black;">½</p>
        <p>Join us on <a href="https://t.me/+kSr0IZkRIBw4Mzhh" target="_blank" style="color: blue;"><b>Telegram</b></a> to stay updated.</p>
        <p>View our suggested attire <a href="https://photos.app.goo.gl/ZYhgkeJ9KWHJNgPJ6"><b>mood board</b></a>.</p>
        <!--p>Your payment preimage for your records:<br>
        <span id="preimage" style="font-weight: bold; font-family:monospace"><br>${preimage}</span></p-->
        <p>The halving awaits,<br>
        D++ & Martell</p>
      </div>
    </div>
  </body>
  </center>
  `;

  let mailOptions = {
    from: `"½" <${process.env.EMAIL}>`,
    to: email,
    bcc: 'dplusplus@gmail.com',
    subject: 'The Halving Experience',
    html: message
  };

  send(mailOptions);
}

// This is for the default D++ Notifier email template
function sendEmail(invoice) {
  let sats = "sat";
  let amount = Number(invoice.amt_paid_sat);
  if (amount == 0) {
    // millisats baby
    amount = Number(invoice.amt_paid_msat);
    sats = "millisat";
  }
  let plural = amount > 1 ? 's' : '';
  amount = amount.toLocaleString();
  let preimageBuffer = Buffer.from(invoice.r_preimage, 'base64');
  let preimage = preimageBuffer.toString('hex');
  let verb = zap.on ? "zapped" : "paid";
  let memo;
  let keysend = "";
  let type;

  // invoice, keysend, zap, or Lightning Address

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
      // they zapped my profile
      memo = `<a href="https://primal.net/p/${npub}">${npub}</a> zapped your profile.`;
      if (zap.data.content)
        memo += `<br><br>Message: ${zap.data.content}`;
    }
  }
  else {
    // not a zap, just a regular BOLT11, LN Address, or keysend payment
    memo = invoice.memo;
    keysend = invoice.is_keysend ? " via keysend" : "";
    type    = memo.includes("Sent to: ") ? "LN Address" : (invoice.is_keysend ? "Keysend" : "Invoice");
    if (type == "LN Address") {
      let address = memo.split(' | ')[0];
      let note = memo.split(' | ')[1];
      memo = `${address}`;
      if (note != "I love you!")
        memo += `<br><br>${note}`;
    }
    else {
      memo = invoice.memo ? "Memo: " + invoice.memo : "";
    }

    // temporarily want the whole damn invoice
    // log the whole invoice to see all the details
    // console.log(invoice);
    // const allInvoiceDetails = Object.entries(invoice)
    //   .map(([key, value]) => `${key}: ${value}`)
    //   .join('<br>');
    // memo = allInvoiceDetails;
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
    from: `"D++ Notifier" <${process.env.EMAIL}>`,
    to: 'dplusplus@gmail.com',
    subject: subject,
    html: message
  };

  send(mailOptions);

  // Send a push notification!!
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
    from: `"D++ Notifier" <${process.env.EMAIL}>`,
    to: 'dplusplus@gmail.com',
    subject: `DREAD | Error: Lightning Node Unreacable`,
    html: `WebSocket connection failed. Please unlock your <a href="https://voltage.cloud/">Lightning node</a>.
    <br><br>
    If all goes well, you won't have to re-run <a href="https://dpluspl.us/api/notifier">notifier.js</a>!
    <br><br>
    Triggered ${note}.
    `
  };
  send(mailOptions);
  errorEmailSent = true;

  if (note.includes("Pong"))
    pushNotification(`Lightning node unreachable.`, `Pong not received in the last 2 minutes!`);
}

function messageEmail(subject, html) {
  let mailOptions = {
    from: `"D++ Notifier" <${process.env.EMAIL}>`,
    to: 'dplusplus@gmail.com',
    subject: subject,
    html: html
  };
  send(mailOptions);
}

function findZapInvoice(r_preimage) {
  console.log("r_preimage inside of findZapInvoice");
  r_preimage = Buffer.from(r_preimage, 'base64');
  console.log(r_preimage);
  const r_hash = crypto.createHash('sha256').update(r_preimage).digest();
  console.log("r_hash inside of findZapInvoice");
  console.log(r_hash);
  let request = {
    r_hash: r_hash
  };

  return new Promise(function(resolve, reject) {
    lightning.lookupInvoice(request, function(err, response) {
      console.log("response inside of lightning.lookupInvoice: ");
      console.log(response);
      console.log(response.memo);
      resolve(response.memo);
    });
  });
}

function pushNotification(subject, body) {
  axios.post('https://api.pushover.net/1/messages.json', {
    token: PUSH_TOKEN,
    user:  PUSH_USER,
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
  console.log("inside notify()!");
  let requestBody = {
    // add_index: <uint64>, // <uint64>
    // settle_index: <uint64>, // <uint64>
  };
  let lastPongTimestamp = Date.now();
  let checkPongInterval, reconnectInterval;

  const PING_INTERVAL = 10000; // ping every 10 seconds
  const RECONNECT_INTERVAL = 60000; // attempt to reconnect every minute when disconnected

  function connect() {
    if (connected == true) // don't create multiple connections
      return;

    let ws = new WebSocket(`wss://${restHost}/v1/invoices/subscribe?method=GET`, {
      // Work-around for self-signed certificates.
      rejectUnauthorized: false,
      headers: {
        'Grpc-Metadata-Macaroon': invMacaroon,
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
          // don't send welcome message unless we've established a lasting connection :D
          errorEmailSent = false;
          var message = "Successfully connected websocket."
          messageEmail(message, message);
          console.log("Made a lasting connection!");
        }
      }, 2000);

      ws.send(JSON.stringify(requestBody));

      // send error email if we don't get a pong after a minute
      setInterval(() => ws.ping('Are you there?'), PING_INTERVAL); // ping every 10 seconds
      clearInterval(checkPongInterval);
      checkPongInterval = setInterval(() => {
        const timeSinceLastPong = Date.now() - lastPongTimestamp;
        if (timeSinceLastPong >= 120000) { // send an email if it's been more than two minutes...
          // don't need to do this because the new interval (recconectInterval) handles the reconnection...
          // connected = false;
          errorEmail("inside checkPongInterval");
          console.error('Pong not received in time, connection might be lost');
          clearInterval(checkPongInterval);
        }
      }, PING_INTERVAL);
    });

    ws.on('message', async function(body) {
      zap.on = false;
      var invoice = JSON.parse(body.toString()).result;
      if (invoice?.state == "SETTLED") {
        console.log("Paid invoice detected!");
        // if it's a zap, include information about who zapped me :)
        if (invoice.memo.includes("Zap!")) {
          zap.data = await findZapInvoice(invoice.r_hash);
          zap.data = JSON.parse(zap.data);
          zap.on = true;
        }
        // always send default email to D++
        sendEmail(invoice);
        // also send halving email if it's a halving ticket confirmation
        if (invoice.memo.includes('HALVING:')) {
          let name = invoice?.memo.split('EMAIL:')[0].split('HALVING:')[1];
          let email = invoice?.memo.split('EMAIL:')[1];
          let preimage = invoice?.r_preimage.toString('hex');
          let amount = invoice?.amt_paid_sat;
          sendHalvingEmail(name, email, preimage, amount);
        }
      }
      else {
        if (invoice)
          console.log("New invoice was added!");
        else {
          // this happens when you can connect to Voltage, but the node is locked!
          connected = false;
          errorEmail(`by "The websocket returned an undefined message. Voltage may need to be unlocked."`);
          console.log("The websocket returned an undefined message. Voltage may need to be unlocked.");
        }
      }
    });

    ws.on('pong', function(data) {
      lastPongTimestamp = Date.now();
      // console.log('Pong received:', data.toString());
    });

    ws.on('close', function() {
      connected = false;
      errorEmail("inside ws.on('close')");
      console.log('WebSocket closed.');
    });

    ws.on('error', function(err) {
      connected = false;
      errorEmail("inside ws.on('error')");
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
