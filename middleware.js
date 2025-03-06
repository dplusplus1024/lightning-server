import { NextResponse } from "next/server";

export function middleware(request) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get("host") || "";

  // For debugging - check what hostname we're seeing
  console.log("Hostname:", hostname);

  // Check if we're on the taddesse.xyz domain (with or without www)
  if (hostname === "taddesse.xyz" || hostname === "www.taddesse.xyz") {
    if (url.pathname === "/") {
      url.pathname = "/corporate.html";
      return NextResponse.redirect(url);
    }
  }

  // Handle islandbitcoin.com domain
  if (hostname === "islandbitcoin.com" || hostname === "www.islandbitcoin.com") {
    if (url.pathname === "/") {
      url.pathname = "/index.html";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

// Configure the middleware to run only on specific paths
export const config = {
  matcher: "/",
};
