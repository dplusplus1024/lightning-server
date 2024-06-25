const axios = require('axios');
// const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
import { NextResponse } from 'next/server';

// const aliases = ['halving', 'bazaar', '💖', '%f0%9f%92%96', '⚡', '%e2%9a%a1', '%e2%9a%a1%ef%b8%8f', '%e2%9a%a1%ef%b8%8e', 'dplusplus', 'me', 'alias', 'd', 'sats', 'node', 'wallet', 'undefined', 'none', 'ping', 'tip', 'tips', 'ln', 'lnurl', 'glitch'];

const aliases = [];

const database = {
  d:    "me@dplus.plus",
  alby: "dread@getalby.com"
}

var lnurl1 = {};
var user, domain, startTime;

function myNode() {
  var meta;
  switch (user) {
    case "glitch":
      meta = "G / L / I / T / C / H";
      break;
    case "bazaar":
      meta = "Bitcoin Bazaar";
      break;
    default:
      meta = "Pay to D++";
  }
  // on digital ocean
  lnurl1.callback = `https://dpluspl.us/api/getInvoice/${user}-${domain}`;
  // lnurl1.callback = `https://dpluspl.us/api/getInvoice?user=${user}`;
  // lnurl1.callback = `https://${domain}/api/getInvoice?user=${user}`;
  lnurl1.maxSendable = 1000000000000;
  lnurl1.minSendable = 1000;
  lnurl1.metadata = JSON.stringify([["text/plain", meta],["text/identifier", `${user}@${domain}`]]);
  lnurl1.commentAllowed = 32;
  lnurl1.tag = "payRequest";
  // this is the pubkey of my server that signs and sends zap receipts (see nostr.js)
  lnurl1.nostrPubkey = "910bf554c8cb3384798d5b1402b79810a44b304c5c8fe1b27d396223e5a04f0e";
  lnurl1.allowsNostr = true;
}

async function mongo() {
  const uri = `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASS}@cluster0.3gijhbz.mongodb.net/?retryWrites=true&w=majority`;
  const client = new MongoClient(uri, {useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1});
  var result = false;
  try {
     await client.connect();
     const collection = client.db("LNURL").collection("aliases");
     var cursor = await collection.findOne({ _id: user });
     console.log('we found: ');
     console.log(cursor);
     if (!cursor) {
       console.log("Not found in mongodb database.");
     }
     else {
       console.log("Found in external database.");
       result = cursor.lnAddress;
     }
     console.log('MongoDB operation successful.');
   } catch (err) {
     console.log('Error connecting to MongoDB: ' + err);
   } finally {
     await client.close();
     return result;
   }
}

async function getLNURL(lnAddress) {
  console.log("inside getLNURL for " + lnAddress);
  let name    = lnAddress.split("@")[0];
  let address = lnAddress.split('@')[1];
  let url     = `https://${address}/.well-known/lnurlp/${name}`;
  console.log(url);
  try {
    const response = await axios.get(url);
    // successful resposne
    console.log("response.data: " + response.data);
    return response.data;
  } catch (error) {
    console.log("There was an error getting the lnurl.");
    return "There was an error fetching your lnurl.";
  }
}

function logTime() {
  console.log("Time elapsed: " + (new Date().getTime() - startTime) + " milliseconds.");
}

export async function GET(req) {
  const startTime = new Date().getTime();
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  const referer = req.headers.referer || "an unknown source";
  const url = new URL(req.url);
  user = url.searchParams.get('user');
  user = user ? user.toLowerCase() : "none";

  console.log(user + ' visited from ' + referer + '.');

  // check the D++ aliases first...
  if (aliases.includes(user)) {
    console.log("In D++ alias list. Going to D++ node...");
    myNode();
    logTime(); // takes 0.0 seconds to return this
    return NextResponse.json(lnurl1, { headers });
  }
  // check for peeps in the internal (fast) database...
  if (user in database) {
    console.log("Found in internal custodial database.");
    let result = await getLNURL(database[user]);
    logTime();
    return NextResponse.json(result, { headers });
  }
  // check external database (MongoDB)
  var getDatabase = await mongo(); // takes about .40 - .55 seconds
  if (getDatabase) {
    console.log("Found in external custodial database (MongoDB).");
    let result = await getLNURL(getDatabase);
    logTime();
    console.log("the result is: ");
    console.log(result);
    return NextResponse.json(result, { headers });
  }
  // catch all case, send to D++ non-custodial node
  // console.log("Catch all case: going to D++ node...");
  // myNode();
  // logTime();

  // return NextResponse.json(lnurl1, { headers });
}
