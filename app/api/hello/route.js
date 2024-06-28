import { NextResponse } from 'next/server';

export async function GET(req) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  console.log("HELLO...");

  return NextResponse.json({ message: "Starting hello.js..." }, { headers });
}
