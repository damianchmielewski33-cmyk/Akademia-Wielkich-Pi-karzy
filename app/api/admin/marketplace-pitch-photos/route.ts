import { put } from "@vercel/blob";
import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";
import { getAppSettings } from "@/lib/app-settings";
import { getDb } from "@/lib/db";
import { imageMimeMatchesMagicBytes } from "@/lib/image-magic";
import {
  BLOB_REQUIRED_ON_VERCEL_MSG,
  deleteProfileBlobIfAny,
  isEphemeralUploadStorage,
  isProfileBlobStorageEnabled,
  isVercelBlobUrl,
} from "@/lib/profile-blob";
import {
  resolveSiteAssetAbsolute,
  siteAssetPublicUrl,
  siteUploadsDir,
} from "@/lib/runtime-paths";
import {
  MARKETPLACE_PITCH_SLOT_COUNT,
  isCustomMarketplacePitchUpload,
  resolveMarketplacePitchPhotoPool,
  serializeMarketplacePitchPhotosJson,
} from "@/lib/marketplace-photos";
import { REALMS } from "@/lib/realm";

export const runtime = "nodejs";

const MAX_BYTES = 3.5 * 1024 * 1024;
const ALLOWED = new Map<string, string>([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
]);

function safeUnlinkLocal(dbPath: string | null | undefined) {
  const abs = dbPath ? resolveSiteAssetAbsolute(dbPath) : null;
  if (!abs) return;
  const dirResolved = path.resolve(siteUploadsDir());
  const resolved = path.resolve(abs);
  if (!resolved.startsWith(dirResolved + path.sep)) return;
  try {
    fs.unlinkSync(resolved);
  } catch {
    /* ignore */
  }
}

async function removeStored(url: string | null | undefined) {
  if (!url) return;
  if (isVercelBlobUrl(url)) {
    await deleteProfileBlobIfAny(url);
    return;
  }
  safeUnlinkLocal(url);
}

function parseIndex(raw: unknown): number | null {
  const n = typeof raw === "string" ? Number.parseInt(raw, 10) : typeof raw === "number" ? raw : NaN;
  if (!Number.isInteger(n) || n < 0 || n >= MARKETPLACE_PITCH_SLOT_COUNT) return null;
  return n;
}

async function persistSlots(slots: (string | null)[]) {
  const db = await getDb();
  await db
    .prepare(`UPDATE app_settings SET marketplace_pitch_photos_json = ? WHERE realm = ?`)
    .run(serializeMarketplacePitchPhotosJson(slots), REALMS.ACADEMY);
  return getAppSettings(db, REALMS.ACADEMY);
}

/** POST — wgraj zdjęcie slotu (multipart: index, file). */
export async function POST(req: Request) {
  const gate = await requireAdmin("site");
  if (!gate.ok) return gate.response;

  try {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json(
        { error: "Nie udało się odczytać pliku. Skompresuj do max 3,5 MB i spróbuj ponownie." },
        { status: 400 }
      );
    }

    const index = parseIndex(form.get("index"));
    if (index == null) {
      return NextResponse.json({ error: "Nieprawidłowy numer zdjęcia." }, { status: 400 });
    }

    const file = form.get("file");
    if (!file || !(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Wybierz plik (JPG/PNG/WebP, max 3,5 MB)." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Plik jest za duży (max 3,5 MB)." }, { status: 400 });
    }

    const mime = (file.type || "").toLowerCase();
    const ext = ALLOWED.get(mime);
    if (!ext) {
      return NextResponse.json({ error: "Dozwolone: JPG, PNG, WebP, GIF." }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    if (!imageMimeMatchesMagicBytes(buf, mime)) {
      return NextResponse.json({ error: "Zawartość pliku nie odpowiada formatowi obrazu." }, { status: 400 });
    }

    const db = await getDb();
    const settings = await getAppSettings(db, REALMS.ACADEMY);
    const slots = [...settings.marketplace_pitch_photos_custom];
    const prev = slots[index];
    if (isCustomMarketplacePitchUpload(prev)) {
      await removeStored(prev);
    }

    let publicPath: string;
    if (isProfileBlobStorageEnabled()) {
      try {
        const pathname = `site/mp-pitch-${index}-${Date.now()}${ext}`;
        const blob = await put(pathname, buf, { access: "public", contentType: mime });
        publicPath = blob.url;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "błąd magazynu Blob";
        return NextResponse.json({ error: `Nie udało się zapisać: ${msg}` }, { status: 503 });
      }
    } else if (isEphemeralUploadStorage()) {
      return NextResponse.json({ error: BLOB_REQUIRED_ON_VERCEL_MSG }, { status: 503 });
    } else {
      try {
        fs.mkdirSync(siteUploadsDir(), { recursive: true });
        const filename = `mp-pitch-${index}-${Date.now()}${ext}`;
        publicPath = siteAssetPublicUrl(filename);
        fs.writeFileSync(path.join(siteUploadsDir(), filename), buf);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "błąd zapisu";
        return NextResponse.json({ error: `Nie udało się zapisać: ${msg}` }, { status: 503 });
      }
    }

    slots[index] = publicPath;
    const updated = await persistSlots(slots);
    return NextResponse.json({
      ok: true,
      index,
      url: updated.marketplace_pitch_photos[index],
      photos: updated.marketplace_pitch_photos,
      custom: updated.marketplace_pitch_photos_custom,
      settings: updated,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "nieznany błąd";
    return NextResponse.json({ error: `Wgrywanie nie powiodło się: ${msg}` }, { status: 500 });
  }
}

/** DELETE — przywróć domyślne zdjęcie slotu (?index=0). */
export async function DELETE(req: Request) {
  const gate = await requireAdmin("site");
  if (!gate.ok) return gate.response;

  try {
    const url = new URL(req.url);
    const index = parseIndex(url.searchParams.get("index"));
    if (index == null) {
      return NextResponse.json({ error: "Nieprawidłowy numer zdjęcia." }, { status: 400 });
    }

    const db = await getDb();
    const settings = await getAppSettings(db, REALMS.ACADEMY);
    const slots = [...settings.marketplace_pitch_photos_custom];
    const prev = slots[index];
    if (isCustomMarketplacePitchUpload(prev)) {
      await removeStored(prev);
    }
    slots[index] = null;
    const updated = await persistSlots(slots);
    return NextResponse.json({
      ok: true,
      index,
      url: updated.marketplace_pitch_photos[index],
      photos: updated.marketplace_pitch_photos,
      custom: updated.marketplace_pitch_photos_custom,
      default_pool: resolveMarketplacePitchPhotoPool(slots),
      settings: updated,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "nieznany błąd";
    return NextResponse.json({ error: `Przywracanie nie powiodło się: ${msg}` }, { status: 500 });
  }
}
