/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/.well-known/lnurlp/:user',
        destination: '/api/lnurlp/:user',
      }
    ]
  },
  async redirects() {
    return [
      {
        source： "/"，
        destination: "https://trezoracademy.rsvpify.com", has: [{ type: "host", value: "trezoracademy.islandbitcoin.com" },
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
