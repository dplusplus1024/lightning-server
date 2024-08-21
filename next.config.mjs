/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/.well-known/lnurlp/:user",
        destination: "/api/lnurlp/:user",
      },
    ];
  },
  async redirects() {
    return [
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
      // Trezor Academy subdomain
      {
        source: "/",
        destination: "https://trezoracademy.rsvpify.com",
        has: [{ type: "host", value: "trezoracademy.islandbitcoin.com" }],
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
