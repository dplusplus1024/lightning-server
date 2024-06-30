![Logo](https://i.imgur.com/iexBI5J.jpeg)

## About

No more invoicing! **Lightning Server** enables you to receive [Lightning Address](https://lightningaddress.com) payments to an address that looks like you@yourdomain.com. Additionally, you'll get [Zap receipts](https://github.com/nostr-protocol/nips/blob/master/57.md) on Nostr, as well as email and **push notifications** sent to all your devices whenever you receive a Lightning payment of any kind. Never miss a payment alert!

## Prerequisites

You'll need a Lightning node running [LND](https://github.com/lightningnetwork/lnd) and your own domain. Need a node? [Voltage](https://voltage.cloud) makes it easy and is a great place to get started! Make sure you have some key pieces of information handy, such as your node's REST and gRPC API endpoints, as well as your invoice macaroon. 

## Deploying Lightning Server

If you don't already have a VPS, the easiest way to deploy and host **Lightning Server** is to use [DigitialOcean's App Platform](https://www.digitalocean.com/products/app-platform), which will cost approximately $5.00 per month at the time of this writing. If you choose to use [Vercel](https://vercel.com), functionality will be *limited to a working Lightning Address only* - you won't get the benefit of Nostr Zap receipts, email notifications, or push notifications. [Heroku](https://www.heroku.com/) is not recommended.

## Lightning Server uses Next.js

**Lightning Server** is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## Warning

This is experimental software, currently still in beta. Use at your own risk!

## To Do

- Continue refactoring, polishing, and optimizing code.
- Add Lightning Point of Sale.
- Add code to automatically run notifier.js.
- Add more detailed documentation.
- Teach a workshop on how to run this server!
