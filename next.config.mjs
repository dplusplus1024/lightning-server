/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/.well-known/lnurlp/:user',
        destination: '/api/lnurlp',
      },
      // add clean urls
      {
        source: "/:path*",
        destination: "/:path*.html",
      },
    ]
  }
};

export default nextConfig;
