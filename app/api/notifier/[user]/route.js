// This has to be run at https://${DOMAIN}/api/notifier/run after you've deployed your project
// It will run automatically if you use the ./push bash script (but please help me find a better way...)

import path from 'path';
import crypto from 'crypto';
import * as nostr from 'nostr-tools';
import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';
const WebSocket = require('ws');
const grpc = require('@grpc/grpc-js');
const { bech32 } = require('bech32');
const axios = require('axios');
const protoLoader = require('@grpc/proto-loader');

const zap = {};
let connected = false;
let errorEmailSent = false;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  // This doesn't need to be your primary email; you can set up a new Gmail account
  // specifically for sending notifications. Once you do, create an "app password"
  // at https://myaccount.google.com/apppasswords
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

function capitalize(string) {
  if (string.length === 0) return string;
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function sendEmail(invoice) {
  let sats = "sat";
  let amount = Number(invoice.amt_paid_sat);
  if (amount == 0) {
    amount = Number(invoice.amt_paid_msat);
    sats = "millisat";
  }
  let plural = amount > 1 ? 's' : '';
  let verb = zap.on ? "zapped" : "paid";
  let memo;
  let type;
  let keysend = "";
  let user = "You";
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
    type = memo.includes("Sent to: ") ? "LN Address" : (invoice.is_keysend ? "Keysend" : "Invoice");
    if (type == "LN Address") {
      const note = memo.split(' | ')[1];
      const address = decodeURIComponent(memo.split(' | ')[0]);
      memo = note ? `${address}<br><br>${note}` : `${address}`;
      user = address.split('@')[0];
      user = capitalize(user.split("Sent to: ")[1]) + ", you";
    }
    else {
      memo = invoice.memo ? "Memo: " + invoice.memo : "";
    }
  }
  const spacer = memo ? "<br><br>" : "";
  const message = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>${type} Payment Notification</title>
    <style>
      body {
        background-color: #0514f0;
        color: #fff;
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 0;
        text-align: center;
      }
      .email-container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #0514f0;
        color: #fff;
        border-radius: 8px;
        overflow: hidden;
      }
      a {
        color:white;
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
        font-weight:bold;
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
            <div class="email-content">
              <br>
              <center><img src="https://i.imgur.com/OaXh4HT.png" alt="Node Notifier" style="width:425px; margin: 0;"/></center>
              <h1 style="text-shadow: 2px 2px 0px black;">${type} Payment Received</h1>
              <p style="font-size: 18px;">
              <b>You just got ${verb} <b>${amount}</b> ${sats}${plural}${keysend}!</b></p>
              ${memo}${spacer}
              <br><br><br><br>
            </div>
            <div class="footer">
              Made with ❤️ by <a href="https://x.com/d_plus__plus">D++</a>
              <br><br>
            </div>
          </div>
        </td>
      </tr>
    </table>
  </body>
  </html>`;

  const subject = `${user} got ${verb} ${amount} ${sats}${plural}${keysend}!`;
  const mailOptions = {
    from: `"Node Notifier" <${process.env.EMAIL}>`,
    to: process.env.EMAIL_RECIPIENT,
    bcc: process.env.EMAIL_BCC,
    subject: subject,
    html: message
  };

  send(mailOptions);

  // send a push notification!
  if (type != "LN Address")
    type = type.toLowerCase();
  if (type == "zap")
    type = "Nostr";
  pushNotification(`${user} got ${verb} ${amount} ${sats}${plural} via ${type}!`, `Amount: ${amount} ${sats}${plural} ${spacer}${memo}`);
}

// if the node is unreachable, send an email notification
function errorEmail(note) {
  if (errorEmailSent)
    return;

  const mailOptions = {
    from: `"Node Notifier" <${process.env.EMAIL}>`,
    to: process.env.EMAIL_RECIPIENT,
    subject: `Error: Lightning Node Unreacable`,
    html: `WebSocket connection failed. Please check your Lightning node.
    <br><br>
    If all goes well, you won't have to re-run <a href="https://${DOMAIN}/api/notifier/run">notifier.js</a>!
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
  const mailOptions = {
    from: `"Node Notifier" <${process.env.EMAIL_SENDER}>`,
    to: process.env.EMAIL_RECIPIENT,
    subject: subject,
    html: html
  };
  send(mailOptions);
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
    console.log("Push notification sent:", response.data);
  })
  .catch(error => {
    console.error("Error sending push notification:", error);
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
        if (invoice.memo.includes("Nostr Zap!")) {
          zap.data = JSON.parse(invoice.memo);
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
