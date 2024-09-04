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
        destination: "/api/nostr/user",
      },
    ];
  },
  async redirects() {
    return [
      // Trezor Academy subdomain
      {
        source: "/",
        destination: "https://trezoracademy.rsvpify.com",
        has: [{ type: "host", value: "trezoracademy.islandbitcoin.com" }],
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
