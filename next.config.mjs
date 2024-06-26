/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/.well-known/lnurlp/:name*',
        destination: '/api/lnurlp?user=:name',
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
