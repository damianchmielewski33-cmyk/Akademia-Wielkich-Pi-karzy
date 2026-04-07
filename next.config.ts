import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
] as const;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
        pathname: "/**",
      },
    ],
  },
  serverExternalPackages: ["better-sqlite3"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  async headers() {
    return [{ source: "/:path*", headers: [...securityHeaders] }];
  },
  async redirects() {
    return [
      { source: "/admin", destination: "/panel-admina", permanent: false },
      { source: "/terminator", destination: "/terminarz", permanent: true },
      { source: "/terminator/:path*", destination: "/terminarz", permanent: true },
    ];
  },
};

export default nextConfig;
