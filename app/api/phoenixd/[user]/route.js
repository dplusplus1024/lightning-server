// This endpoint serves as the notifier for phoenixd webhooks!
// Be sure to place your webhook-secret in env.PHOENIXD_WEBHOOK_SECRET
// In phoenix.conf, add the following to turn on webhooks:
// webhook=https://youdomain.com/api/phoenixd/route

const crypto = require('crypto');
const axios = require('axios');
import { buffer } from 'micro';
import { NextResponse } from 'next/server';

const PUSH_TOKEN = process.env.TEST_PUSH_TOKEN;
const PUSH_USER  = process.env.TEST_PUSH_USER;

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

export async function POST(req) {
  console.log("Welcome to phoenixd!");

  const body = await buffer(req);
  const bodyRaw = Buffer.from(body, 'utf8');
  const bodyJSON = JSON.parse(bodyRaw);
  console.log('Webhook received:', bodyJSON);

  // Calculate the HMAC SHA256 hash
  const secret = Buffer.from(process.env.PHOENIXD_WEBHOOK_SECRET, 'utf8');
  const signature = req.headers['x-phoenix-signature'];
  const hash = crypto.createHmac('sha256', secret)
                     .update(bodyRaw)
                     .digest('hex');

  if (crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(hash, 'hex'))) {
    // Signature was valid!
    let type = bodyJSON?.type;
    let amount = Number(bodyJSON?.amountSat);
    let plural = amount > 1 ? 's' : '';
    amount = amount.toLocaleString();

    if (type == 'payment_received') {
      let subject = `Test: You got paid ${amount} sat${plural} via phoenixd!`;
      let message = `Amount: ${amount} sat${plural} received on <b>phoenixd</b>.`;
      pushNotification(subject, message);
    }
  }
  else {
    console.log('Invalid signature.');
  }

  return NextResponse.json({ message: 'Webhook received loud and clear!' });
}
