// This endpoint serves as the notifier for phoenixd webhooks!
// Be sure to place your webhook-secret in env.PHOENIXD_WEBHOOK_SECRET

const crypto = require('crypto');
const axios = require('axios');
import { buffer } from 'micro';
import { NextResponse } from 'next/server';

const PUSH_TOKEN = 'aj7s6xcw4cz4wevqpdjdymogquw75c';
const PUSH_USER  = 'uwvfbh6kp2tomsi3pnitzskfozeo93';

const PUSH_TOKEN = process.env.TEST_PUSH_TOKEN;
const PUSH_USER  = process.env.TEST_PUSH_USER;

export const config = {
  api: {
    bodyParser: false,
  },
};

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

export async function GET(req) {
  if (req.method !== 'POST') {
    return NextResponse.json({ message: 'Method not allowed.' });
  }

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
      let message = `Amount: ${amount} sat${plural} was received on <b>phoenixd</b>.`;
      pushNotification(subject, message);
    }
  }
  else {
    console.log('Invalid signature.');
  }

  return NextResponse.json({ message: 'Webhook received loud and clear!' });
}
