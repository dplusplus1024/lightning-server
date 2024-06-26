/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/.well-known/lnurlp/:username',
        destination: '/api/lnurlp?user=:username', // Ensure query string is passed
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
