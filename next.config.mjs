/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/.well-known/lnurlp/:user",
        destination: "/api/lnurlp/:user",
      },
      {
        source: "/.well-known/nostr.json",
        destination: "/api/nostr/name",
      },
    ];
  },
  async redirects() {
    return [
      // Main homepages
      {
        source: "/",
        destination: "/index.html",
        permanent: true,
      },
      {
        source: "/",
        destination: "/index.html",
        has: [{ type: "host", value: "www.islandbitcoin.com" }],
        permanent: true,
      },
      {
        source: "/",
        destination: "/corporate.html",
        has: [{ type: "host", value: "taddesse.xyz" }],
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
