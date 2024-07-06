const axios = require('axios');
const { NextResponse } = require('next/server');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// list of valid users; not needed if process.env.CATCH_ALL is set to true
const users = process.env.USERS.split(/\s*,\s*/);
// redirects that forward to external Lightning Addresses
const forwards = JSON.parse(process.env.FORWARDS);

let lnurl = {};
let user, startTime;

function myNode() {
  let meta;
  let address = `${user}@${process.env.DOMAIN}`;

  switch (user) {
    case "user1":
      meta = "Example 1";
      break;
    case "user2":
      meta = "Example 2";
      break;
    default:
      meta = process.env.META || `Pay to ${address}`;
  }

  lnurl.callback = `https://${process.env.DOMAIN}/api/getInvoice/${user}`;
  lnurl.maxSendable = 1000000000000; // values are in millisats
  lnurl.minSendable = 1000;
  lnurl.metadata = JSON.stringify([["text/plain", meta],["text/identifier", `${address}`]]);
  lnurl.commentAllowed = 32;
  lnurl.tag = "payRequest";
  // this is the Nostr pubkey that signs and publishes zap receipts
  lnurl.nostrPubkey = process.env.NOSTR_PUBLIC_KEY;
  lnurl.allowsNostr = true;
}

// optional if you'd like to dynamically add new forwards to your database, e.g. see https://dplus.plus/alias
async function getMongoUser() {
  const uri = `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASS}@${process.env.MONGODB_URL}`;
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

  try {
    await client.connect();
    const collection = client.db("LNURL").collection("aliases");
    const cursor = await collection.findOne({ _id: user });

    if (!cursor) {
      console.log("User not found in MongoDB database.");
      return false;
    }

    console.log(`${cursor.lnAddress} found in MongoDB database.`);
    return cursor.lnAddress;
  } catch (err) {
    console.error('Error connecting to MongoDB: ', err);
    return false;
  } finally {
    await client.close();
  }
}

async function getLNURL(lnAddress) {
  const [name, address] = lnAddress.split("@");
  const url = `https://${address}/.well-known/lnurlp/${name}`;

  try {
    const response = await axios.get(url);
    console.log(`response.data: ${response.data}`);
    return response.data;
  } catch (error) {
    console.log("There was an error getting the LNURL.");
    return "There was an error fetching your LNURL.";
  }
}

function logTime() {
  console.log(`Time elapsed: ${new Date().getTime() - startTime} milliseconds.`);
}

export async function GET(req, { params }) {
  startTime = new Date().getTime();
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  const referer = req.headers.referer || "an unknown source";
  user = params.user.toLowerCase();
  console.log(user + ' visited from ' + referer + '.');

  if (!user)
    return NextResponse.json({ message: "No user was specified." }, { headers });

  // check the aliases first...
  if (users.includes(user)) {
    myNode();
    logTime(); // takes 0.0 seconds to return this
    return NextResponse.json(lnurl, { headers });
  }
  // next, check if they're set up as a forward...
  if (user in forwards) {
    let result = await getLNURL(forwards[user]);
    logTime();
    return NextResponse.json(result, { headers });
  }
  // check for user in external forwards database (MongoDB)...
  if (process.env.USE_MONGO === "true") {
    let databaseUser = await getMongoUser(); // takes about .40 - .55 seconds
    if (databaseUser) {
      let result = await getLNURL(databaseUser);
      logTime();
      return NextResponse.json(result, { headers });
    }
  }
  // you can decide if you want any arbitrary username to be valid or not
  if (process.env.CATCH_ALL === "false") {
    return NextResponse.json({ message: `User ${user} not found.` }, { headers });
  }

  myNode();
  logTime();
  return NextResponse.json(lnurl, { headers });
}
