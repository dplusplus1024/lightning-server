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
    ];
  },
};

export default nextConfig;
