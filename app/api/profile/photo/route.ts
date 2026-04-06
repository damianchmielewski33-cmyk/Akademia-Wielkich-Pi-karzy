import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getDb, logActivity } from "@/lib/db";
import { requireUser } from "@/lib/api-helpers";
import {
  profilePhotoPublicUrl,
  profileUploadsDir,
  resolveProfilePhotoAbsolute,
} from "@/lib/runtime-paths";

export const runtime = "nodejs";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Map<string, string>([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
]);

function safeUnlink(dbPath: string | null | undefined) {
  const abs = dbPath ? resolveProfilePhotoAbsolute(dbPath) : null;
  if (!abs) return;
  const dirResolved = path.resolve(profileUploadsDir());
  const resolved = path.resolve(abs);
  if (!resolved.startsWith(dirResolved + path.sep)) return;
  try {
    fs.unlinkSync(resolved);
  } catch {
    /* ignore */
  }
}

export async function POST(req: Request) {
  const gate = await requireUser();
  if (!gate.ok) return gate.response;
  const session = gate.session;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe dane formularza" }, { status: 400 });
  }

  const file = form.get("photo");
  if (!file || !(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Wybierz plik zdjęcia." }, { status: 400 });
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

  const db = await getDb();
  const prev = await db
    .prepare("SELECT profile_photo_path FROM users WHERE id = ?")
    .get(session.userId) as { profile_photo_path: string | null } | undefined;
  if (!prev) return NextResponse.json({ error: "Nie znaleziono konta" }, { status: 404 });

  fs.mkdirSync(profileUploadsDir(), { recursive: true });

  if (prev.profile_photo_path) {
    safeUnlink(prev.profile_photo_path);
  }

  const filename = `${session.userId}-${Date.now()}${ext}`;
  const publicPath = profilePhotoPublicUrl(filename);
  const abs = path.join(profileUploadsDir(), filename);
  fs.writeFileSync(abs, buf);

  await db.prepare("UPDATE users SET profile_photo_path = ? WHERE id = ?").run(publicPath, session.userId);
  logActivity(session.userId, "Zaktualizował zdjęcie profilowe");

  return NextResponse.json({ ok: true, profile_photo_path: publicPath });
}

export async function DELETE() {
  const gate = await requireUser();
  if (!gate.ok) return gate.response;
  const session = gate.session;

  const db = await getDb();
  const prev = await db
    .prepare("SELECT profile_photo_path FROM users WHERE id = ?")
    .get(session.userId) as { profile_photo_path: string | null } | undefined;
  if (!prev) return NextResponse.json({ error: "Nie znaleziono konta" }, { status: 404 });

  if (prev.profile_photo_path) {
    safeUnlink(prev.profile_photo_path);
  }

  await db.prepare("UPDATE users SET profile_photo_path = NULL WHERE id = ?").run(session.userId);
  logActivity(session.userId, "Usunął zdjęcie profilowe");

  return NextResponse.json({ ok: true, profile_photo_path: null });
}
