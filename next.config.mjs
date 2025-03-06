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
      // {
      //   source: "/css/:path*",
      //   destination: "/css/:path*",
      // },
      // {
      //   source: "/js/:path*",
      //   destination: "/js/:path*",
      // },
      // {
      //   source: "/images/:path*",
      //   destination: "/images/:path*",
      // },
      // // Handle HTML pages
      // {
      //   source: "/:path*.html",
      //   destination: "/:path*.html",
      // },
    ];
  },
  async redirects() {
    return [
      // Put domain-specific redirects first
      {
        source: "/",
        destination: "/corporate.html",
        has: [{ type: "host", value: "www.taddesse.xyz" }],
        permanent: true,
      },
      {
        source: "/",
        destination: "/corporate.html",
        has: [{ type: "host", value: "taddesse.xyz" }], // Add this rule for non-www version
        permanent: true,
      },
      {
        source: "/",
        destination: "/index.html",
        has: [{ type: "host", value: "www.islandbitcoin.com" }],
        permanent: true,
      },
      // General fallback comes last
      {
        source: "/",
        destination: "/index.html",
        permanent: true,
      },
    ];
  },
};
export default nextConfig;
