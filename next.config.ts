import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  async redirects() {
    return [
      { source: "/admin", destination: "/panel-admina", permanent: false },
      { source: "/terminator", destination: "/terminarz", permanent: true },
      { source: "/terminator/:path*", destination: "/terminarz", permanent: true },
    ];
  },
};

export default nextConfig;
