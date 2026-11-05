import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pins the workspace root: a lockfile higher up the tree would otherwise be picked.
  turbopack: { root: import.meta.dirname },
  // Database drivers load native or WASM files, so they stay out of the bundle.
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  poweredByHeader: false,
  async redirects() {
    // The bare domain follows the browser's language. Every shared link can
    // also name a language directly: /en or /ar.
    return [
      {
        source: "/",
        has: [{ type: "header", key: "accept-language", value: "ar.*" }],
        destination: "/ar",
        permanent: false,
      },
      { source: "/", destination: "/en", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
