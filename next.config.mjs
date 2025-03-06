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
      // Add necessary rewrites for static assets
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
      // Domain-specific home pages should come FIRST
      {
        source: "/",
        destination: "/corporate.html",
        has: [{ type: "host", value: "taddesse.xyz" }], // Removed www.
        permanent: true,
      },
      {
        source: "/",
        destination: "/corporate.html",
        has: [{ type: "host", value: "www.taddesse.xyz" }], // Keep this for www version too
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
        destination: "/index.html",
        has: [{ type: "host", value: "islandbitcoin.com" }], // Added non-www version
        permanent: true,
      },
      // Default fallback (should be last)
      {
        source: "/",
        destination: "/index.html",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
