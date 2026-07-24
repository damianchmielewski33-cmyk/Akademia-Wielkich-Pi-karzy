import { NextResponse } from "next/server";

export const runtime = "nodejs";

function getFingerprints(): string[] {
  return (process.env.ANDROID_APP_SHA256_CERT_FINGERPRINTS ?? "")
    .split(/[,\n]/)
    .map((v) => v.trim())
    .filter(Boolean);
}

export async function GET() {
  const packageName = process.env.ANDROID_APP_PACKAGE_NAME?.trim() || "pl.akademiawielkichpilkarzy.player";
  const fingerprints = getFingerprints();

  return NextResponse.json(
    fingerprints.map((fingerprint) => ({
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: packageName,
        sha256_cert_fingerprints: [fingerprint],
      },
    }))
  );
}
