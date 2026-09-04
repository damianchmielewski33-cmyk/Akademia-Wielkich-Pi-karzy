import path from "path";
import { fileURLToPath } from "url";
import type { NextConfig } from "next";
import { getAwpEmbedOrigins } from "@awp/sister-sites";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.join(projectRoot, "..");
const awpFrameAncestors = getAwpEmbedOrigins().join(" ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@awp/sister-sites"],
  outputFileTracingRoot: monorepoRoot,
  turbopack: {},

  compress: true,
  poweredByHeader: false,

  async headers() {
    const isProd = process.env.NODE_ENV === "production";
    /**
     * Embed z AWP (/gymbrat iframe):
     * - NIE ustawiaj X-Frame-Options: DENY (blokuje iframe).
     * - frame-ancestors w CSP = jedyne ograniczenie osadzania.
     * - CORP cross-origin: dokument ładuje się w iframe z innego hosta Vercel.
     */
    const base = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
      { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
      {
        key: "Content-Security-Policy",
        value: `frame-ancestors 'self' ${awpFrameAncestors}`,
      },
    ];

    const cspReportEndpointPath = "/api/security/csp-report";
    const reportGroup = "csp-endpoint";
    const reportTo = JSON.stringify([
      {
        group: reportGroup,
        max_age: 60 * 60 * 24 * 7,
        endpoints: [{ url: cspReportEndpointPath }],
      },
    ]);

    // Report-Only bez frame-ancestors — enforce jest w CSP powyżej.
    const cspReportOnly = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "form-action 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://image.pollinations.ai",
      "font-src 'self' data:",
      "connect-src 'self'",
      `report-to ${reportGroup}`,
    ].join("; ");

    const prodOnly = isProd
      ? [
          {
            key: "Strict-Transport-Security",
            value: "max-age=15552000; includeSubDomains",
          },
          { key: "Report-To", value: reportTo },
          { key: "Reporting-Endpoints", value: `${reportGroup}="${cspReportEndpointPath}"` },
          { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
        ]
      : [];
    return [
      {
        source: "/:path*",
        headers: [...base, ...prodOnly],
      },
    ];
  },

  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "framer-motion",
      "@base-ui/react",
    ],
  },
};

export default nextConfig;
