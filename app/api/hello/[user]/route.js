import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  console.log("hello bbgirl!");
  return NextResponse.json({ message: "hello!" }, { headers });

}
