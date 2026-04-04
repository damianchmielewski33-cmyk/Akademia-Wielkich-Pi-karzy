import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  async redirects() {
    return [{ source: "/admin", destination: "/panel-admina", permanent: false }];
  },
};

export default nextConfig;
