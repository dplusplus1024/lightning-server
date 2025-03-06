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
      // Handle static assets explicitly
      {
        source: "/css/:path*",
        destination: "/css/:path*",
      },
      {
        source: "/js/:path*",
        destination: "/js/:path*",
      },
      {
        source: "/images/:path*",
        destination: "/images/:path*",
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
        has: [{ type: "host", value: "www.taddesse.xyz" }],
        permanent: true,
      },
    ];
  },
};
export default nextConfig;
