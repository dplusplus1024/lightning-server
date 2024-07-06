![Logo](https://i.imgur.com/iexBI5J.jpeg)

## About

No more invoicing! **Lightning Server** enables you to receive [Lightning Address](https://lightningaddress.com) payments to an address like you@yourdomain.com. Additionally, you'll get [Zap receipts](https://github.com/nostr-protocol/nips/blob/master/57.md) on Nostr, as well as **email** and **push notifications** sent to all your devices whenever you receive a Lightning payment of any kind. Never miss a payment alert!

## Features

- Lightning Address
- Email notifications
- Push notifications
- Nostr Zap receipts
- Easy Point of Sale (coming soon!)

## Prerequisites

You'll need a Lightning node running [LND](https://github.com/lightningnetwork/lnd) and your own domain. Need a node? [Voltage](https://voltage.cloud) makes it easy and is a great place to get started! Make sure you have some key pieces of information handy, such as your node's REST and gRPC API endpoints, as well as your invoice macaroon.

## Deploying Lightning Server

If you don't already have a VPS, the easiest way to deploy and host **Lightning Server** is to use [DigitialOcean's App Platform](https://www.digitalocean.com/products/app-platform), which will cost approximately $5.00 per month at the time of this writing. If you choose to use [Vercel](https://vercel.com), functionality will be *limited to a working Lightning Address only* - you won't get the benefit of Nostr Zap receipts, email notifications, or push notifications. [Heroku](https://www.heroku.com/) is not recommended.

## Lightning Server uses Next.js

**Lightning Server** is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## Environment Variables

To run this project, you will need to add the following environment variables to your `.env` file:

| Variable Name        | Description                                                  |
|----------------------|--------------------------------------------------------------|
| `DOMAIN`             | The domain where your application is hosted.                 |
| `MONGODB_USER`       | Optional: The username for your MongoDB database.            |
| `MONGODB_PASS`       | Optional: The password for your MongoDB database.            |
| `MONGODB_URL`        | Optional: The URL for your MongoDB instance.                 |
| `NOSTR_PUBLIC_KEY`   | The Nostr public key for signing and publishing zap receipts.|

### Example `.env` file

```env
DOMAIN=example.com
MONGODB_USER=myMongoUser
MONGODB_PASS=myMongoPassword
MONGODB_URL=myMongoDBURL
NOSTR_PUBLIC_KEY=myNostrPublicKey
```

## Running the Notifier

After you've deployed the project, you'll need to start the Notifier.js at https://yourdomain.com/api/notifier/run

Included is a bash script in the root directory that can be run from the console using `./push` anytime you make changes to the project. However, I feel like I'm missing something, as there's got to be a better way to do this. Help anyone?

## Warning

This is experimental software, currently still in beta. Use at your own risk!

## To Do

- Continue refactoring, polishing, and optimizing code.
- Add Lightning Point of Sale.
- Add code to automatically run notifier.js.
- Add more detailed documentation.
- Host an online workshop on how to run this server!
