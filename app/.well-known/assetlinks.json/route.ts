import { NextResponse } from "next/server";

export const runtime = "nodejs";

function getFingerprints(): string[] {
  return (process.env.ANDROID_APP_SHA256_CERT_FINGERPRINTS ?? "")
    .split(/[,\n]/)
    .map((v) => v.trim().replace(/\s+/g, ""))
    .filter(Boolean)
    .map((fp) => fp.toUpperCase());
}

/**
 * Digital Asset Links — wymagane, żeby Android App Links otwierały
 * /zaproszenie i /platnosci* w APK zamiast w Chrome.
 * @see https://developers.google.com/digital-asset-links/v1/getting-started
 */
export async function GET() {
  const packageName =
    process.env.ANDROID_APP_PACKAGE_NAME?.trim() || "pl.akademiawielkichpilkarzy.player";
  const fingerprints = getFingerprints();

  const body =
    fingerprints.length === 0
      ? []
      : [
          {
            relation: ["delegate_permission/common.handle_all_urls"],
            target: {
              namespace: "android_app",
              package_name: packageName,
              sha256_cert_fingerprints: fingerprints,
            },
          },
        ];

  return new NextResponse(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
