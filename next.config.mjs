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
       source: "/",
       destination: "https://treasurebeach.rsvpify.com",
       has: [{ type: "host", value: "treasurebeach.islandbitcoin.com" }],
       permanent: false,
      },
      {
        source: '/treasure',
        destination: 'https://treasurebeach.rsvpify.com',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
