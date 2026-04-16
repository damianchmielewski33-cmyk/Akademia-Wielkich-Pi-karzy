import path from "path";
import type { NextConfig } from "next";
import { fileURLToPath } from "url";

/** Katalog projektu (Next nie powinien brać „root” z nadrzędnego package-lock — ważne m.in. na Vercelu). */
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-site" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
] as const;

const nextConfig: NextConfig = {
  outputFileTracingRoot: projectRoot,
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
    const headers = [...securityHeaders] as { key: string; value: string }[];
    if (process.env.NODE_ENV === "production") {
      // HSTS ma sens tylko na HTTPS; w dev na localhost powoduje problemy.
      headers.push({
        key: "Strict-Transport-Security",
        value: "max-age=15552000; includeSubDomains",
      });
    }
    return [{ source: "/:path*", headers }];
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
