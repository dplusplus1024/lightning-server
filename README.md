![Logo](https://i.imgur.com/iexBI5J.jpeg)

## Prerequisites

You'll need a Lightning node running LND. [Voltage](https://voltage.cloud) is a great place to get started!

## Deploy Lightning Server

If you don't already have a VPS, the easiest way to deploy and host **Lightning Server** is to use [DigitialOcean's App Platform](https://www.digitalocean.com/products/app-platform), which will cost approximately $5.00 per month at the time of this writing. If you choose to use [Vercel](https://vercel.com), functionality will be *limited to a working Lightning Address only* - you won't get the benefit of Nostr Zap receipts, email notifications, or push notifications. [Heroku](https://www.heroku.com/) is not recommended.

## Lightning Server uses Next.js

**Lightning Server** is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## To Do

- Continue refactoring, polishing, and optimizing code.
- Add Lightning Point of Sale.
- Add code to automatically run notifier.js.
- Add more detailed documentation.
- Teach a workshop on how to run this server!
