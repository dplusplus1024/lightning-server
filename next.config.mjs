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
      // Trezor Academy subdomains
      {
        source: "/",
        destination: "https://trezoracademy.rsvpify.com",
        has: [{ type: "host", value: "trezoracademy.islandbitcoin.com" }],
        permanent: false,
      },
      {
        source: "/",
        destination: "https://falmouthbitcoinworkshop.rsvpify.com",
        has: [{ type: "host", value: "falmouth.islandbitcoin.com" }],
        permanent: false,
      },
      // Main homepage
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
    ];
  },
};

export default nextConfig;
