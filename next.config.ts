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
  // same-site blokuje część serwerowych klientów płatności przy odczycie odpowiedzi;
  // webhook HotPay musi móc swobodnie POST-ować na /api/.../notification.
  { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // AdSense: pagead2 + partner / tag services (weryfikacja witryny + wyświetlanie reklam)
      "script-src 'self' 'unsafe-inline' https://pagead2.googlesyndication.com https://partner.googleadservices.com https://www.googletagservices.com https://www.google.com https://ep2.adtrafficquality.google",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https:",
      "frame-src https://www.youtube.com https://googleads.g.doubleclick.net https://tpc.g.doubleclick.net https://www.google.com https://www.googleadservices.com https://pagead2.googlesyndication.com https://ep2.adtrafficquality.google https://www.youtube-nocookie.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "worker-src 'self' blob:",
    ].join("; "),
  },
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
      { source: "/pobierz", destination: "/", permanent: true },
      { source: "/terminator", destination: "/terminarz", permanent: true },
      { source: "/terminator/:path*", destination: "/terminarz", permanent: true },
    ];
  },
};

export default nextConfig;
