import { put } from "@vercel/blob";
import { connection, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getServerSession } from "@/lib/auth";
import { imageMimeMatchesMagicBytes } from "@/lib/image-magic";
import { isProfileBlobStorageEnabled } from "@/lib/profile-blob";
import { checkRateLimit, rateLimitKey, rateLimitedResponse, RATE } from "@/lib/rate-limit";
import { chatAttachmentPublicUrl, chatUploadsDir } from "@/lib/runtime-paths";

export const runtime = "nodejs";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Map<string, string>([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
]);

/** POST — upload grafiki do czatu (multipart: file). Dostępny dla gości, graczy i admina. */
export async function POST(req: Request) {
  await connection();
  const rl = checkRateLimit(
    rateLimitKey("contact_admin_attachment", req),
    RATE.contactAdminAttachment.limit,
    RATE.contactAdminAttachment.windowMs
  );
  if (!rl.ok) return rateLimitedResponse(rl.retryAfterSec);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe dane formularza" }, { status: 400 });
  }

  const file = form.get("file");
  if (!file || !(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Wybierz plik grafiki." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Plik jest za duży (max 2 MB)." }, { status: 400 });
  }

  const mime = (file.type || "").toLowerCase();
  const ext = ALLOWED.get(mime);
  if (!ext) {
    return NextResponse.json({ error: "Dozwolone: JPG, PNG, WebP, GIF." }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > MAX_BYTES) {
    return NextResponse.json({ error: "Plik jest za duży (max 2 MB)." }, { status: 400 });
  }
  if (!imageMimeMatchesMagicBytes(buf, mime)) {
    return NextResponse.json(
      { error: "Zawartość pliku nie odpowiada dozwolonym formatom obrazu." },
      { status: 400 }
    );
  }

  const session = await getServerSession();
  const who = session?.userId != null ? `u${session.userId}` : "guest";
  const filename = `${who}-${Date.now()}${ext}`;

  let publicPath: string;
  if (isProfileBlobStorageEnabled()) {
    const blob = await put(`chat/${filename}`, buf, {
      access: "public",
      contentType: mime,
    });
    publicPath = blob.url;
  } else {
    fs.mkdirSync(chatUploadsDir(), { recursive: true });
    publicPath = chatAttachmentPublicUrl(filename);
    fs.writeFileSync(path.join(chatUploadsDir(), filename), buf);
  }

  return NextResponse.json({ ok: true, url: publicPath });
}
