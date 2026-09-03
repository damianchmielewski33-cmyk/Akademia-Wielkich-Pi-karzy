import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { readContactAdminGuestAccess } from "@/lib/contact-admin-guest";
import { isSafeBlobPathname } from "@/lib/profile-blob";

export const runtime = "nodejs";

/**
 * Prywatny Vercel Blob Store nie serwuje plików po URL CDN.
 * Zdjęcia boiska / profilu / czatu idą przez ten proxy z tokenem serwera.
 */
export async function GET(
  req: Request,
  context: { params: Promise<{ pathname: string[] }> }
) {
  const { pathname: segments } = await context.params;
  const pathname = (segments ?? []).join("/");
  if (!isSafeBlobPathname(pathname)) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (pathname.startsWith("chat/")) {
    const session = await getServerSession();
    const guest = session ? null : await readContactAdminGuestAccess();
    if (!session && !guest) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const ifNoneMatch = req.headers.get("if-none-match") ?? undefined;
  let result;
  try {
    result = await get(pathname, {
      access: "private",
      ifNoneMatch,
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  if (!result) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (result.statusCode === 304) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: result.blob.etag,
        "Cache-Control": cacheControlFor(pathname),
      },
    });
  }

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": cacheControlFor(pathname),
      ETag: result.blob.etag,
    },
  });
}

function cacheControlFor(pathname: string): string {
  if (pathname.startsWith("chat/")) return "private, max-age=3600";
  return "public, max-age=86400, immutable";
}
