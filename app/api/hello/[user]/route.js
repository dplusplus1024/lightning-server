const axios = require('axios');
import { NextResponse } from 'next/server';
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

export async function GET(req, { params }) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  console.log("hello bbgirl!");
  return NextResponse.json({ message: "hello!" }, { headers });

}
