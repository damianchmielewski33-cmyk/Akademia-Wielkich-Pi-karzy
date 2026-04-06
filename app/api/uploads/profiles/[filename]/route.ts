import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { profileUploadsDir } from "@/lib/runtime-paths";

export const runtime = "nodejs";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function GET(
  _req: Request,
  context: { params: Promise<{ filename: string }> }
) {
  const { filename } = await context.params;
  if (!filename || filename !== path.basename(filename)) {
    return new NextResponse("Not found", { status: 404 });
  }
  if (filename.includes("..") || /[/\\]/.test(filename)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const dir = profileUploadsDir();
  const abs = path.resolve(path.join(dir, filename));
  const resolvedDir = path.resolve(dir);
  if (!abs.startsWith(resolvedDir + path.sep)) {
    return new NextResponse("Not found", { status: 404 });
  }

  let buf: Buffer;
  try {
    buf = fs.readFileSync(abs);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  const ext = path.extname(filename).toLowerCase();
  const contentType = MIME[ext] ?? "application/octet-stream";

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
