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
} from "@/lib/runtime-paths-uploads";
import {
  SITE_ASSET_DB_COLUMNS,
  SITE_ASSET_DEFAULTS,
  isSiteAssetKey,
  type SiteAssetKey,
} from "@/lib/site-assets";

export const runtime = "nodejs";

/** Poniżej limitu Vercel (~4,5 MB) i middlewareClientMaxBodySize (5 MB). */
const MAX_BYTES = 3.5 * 1024 * 1024;
const ALLOWED = new Map<string, string>([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
  ["image/svg+xml", ".svg"],
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

async function removeStoredSiteAsset(dbPath: string | null | undefined) {
  if (!dbPath) return;
  if (isVercelBlobUrl(dbPath)) {
    await deleteProfileBlobIfAny(dbPath);
    return;
  }
  safeUnlinkLocal(dbPath);
}

function isCustomUpload(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  const t = url.trim();
  return (
    t.startsWith("/uploads/site/") ||
    t.startsWith("/api/uploads/site/") ||
    isVercelBlobUrl(t)
  );
}

async function updateAssetColumn(db: Awaited<ReturnType<typeof getDb>>, key: SiteAssetKey, url: string | null) {
  const col = SITE_ASSET_DB_COLUMNS[key];
  await db.prepare(`UPDATE app_settings SET ${col} = ? WHERE id = 1`).run(url);
}

function assetUrlFromSettings(settings: Awaited<ReturnType<typeof getAppSettings>>, key: SiteAssetKey): string | null {
  switch (key) {
    case "logo_header":
      return settings.asset_logo_header_url;
    case "logo_crest":
      return settings.asset_logo_crest_url;
    case "logo_login":
      return settings.asset_logo_login_url;
    case "logo_favicon":
      return settings.asset_logo_favicon_url;
    case "bg_soccer_ball":
      return settings.asset_bg_soccer_ball_url;
    case "bg_stadium":
      return settings.asset_bg_stadium_url;
    case "bg_pitch_lines":
      return settings.asset_bg_pitch_lines_url;
  }
}

/** POST — upload grafiki witryny (multipart: asset, file). */
export async function POST(req: Request) {
  const gate = await requireAdmin("site");
  if (!gate.ok) return gate.response;

  try {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json(
        {
          error:
            "Nie udało się odczytać pliku (za duży albo przerwany transfer). Skompresuj do max 3,5 MB i spróbuj ponownie.",
        },
        { status: 400 }
      );
    }

    const assetRaw = form.get("asset");
    if (typeof assetRaw !== "string" || !isSiteAssetKey(assetRaw)) {
      return NextResponse.json({ error: "Nieprawidłowy klucz grafiki." }, { status: 400 });
    }
    const assetKey = assetRaw;

    const file = form.get("file");
    if (!file || !(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: "Wybierz plik grafiki (JPG/PNG/WebP, max 3,5 MB)." },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Plik jest za duży (max 3,5 MB). Skompresuj tło (np. WebP/JPG jakości ~80%)." },
        { status: 400 }
      );
    }

    const mime = (file.type || "").toLowerCase();
    const ext = ALLOWED.get(mime);
    if (!ext) {
      return NextResponse.json(
        { error: "Dozwolone: JPG, PNG, WebP, GIF, SVG (nie HEIC z iPhone — najpierw eksportuj do JPG)." },
        { status: 400 }
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    if (buf.length === 0) {
      return NextResponse.json(
        { error: "Plik dotarł pusty — spróbuj mniejszy obraz (max 3,5 MB) albo inny format." },
        { status: 400 }
      );
    }
    if (buf.length > MAX_BYTES) {
      return NextResponse.json(
        { error: "Plik jest za duży (max 3,5 MB). Skompresuj tło (np. WebP/JPG jakości ~80%)." },
        { status: 400 }
      );
    }
    if (!imageMimeMatchesMagicBytes(buf, mime)) {
      return NextResponse.json(
        { error: "Zawartość pliku nie odpowiada dozwolonym formatom obrazu." },
        { status: 400 }
      );
    }

    const db = await getDb();
    const settings = await getAppSettings(db);
    const prevUrl = assetUrlFromSettings(settings, assetKey);

    if (isCustomUpload(prevUrl)) {
      await removeStoredSiteAsset(prevUrl);
    }

    let publicPath: string;
    if (isProfileBlobStorageEnabled()) {
      try {
        const pathname = `site/${assetKey}-${Date.now()}${ext}`;
        const blob = await put(pathname, buf, {
          access: "public",
          contentType: mime,
        });
        publicPath = blob.url;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "błąd magazynu Blob";
        return NextResponse.json(
          { error: `Nie udało się zapisać grafiki w magazynie: ${msg}` },
          { status: 503 }
        );
      }
    } else if (isEphemeralUploadStorage()) {
      return NextResponse.json({ error: BLOB_REQUIRED_ON_VERCEL_MSG }, { status: 503 });
    } else {
      try {
        fs.mkdirSync(siteUploadsDir(), { recursive: true });
        const filename = `${assetKey}-${Date.now()}${ext}`;
        publicPath = siteAssetPublicUrl(filename);
        fs.writeFileSync(path.join(siteUploadsDir(), filename), buf);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "błąd zapisu pliku";
        return NextResponse.json(
          { error: `Nie udało się zapisać grafiki na dysku: ${msg}` },
          { status: 503 }
        );
      }
    }

    await updateAssetColumn(db, assetKey, publicPath);

    const updated = await getAppSettings(db);
    return NextResponse.json({
      ok: true,
      asset: assetKey,
      url: updated.site_assets[assetKey],
      default_url: SITE_ASSET_DEFAULTS[assetKey],
      settings: updated,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "nieznany błąd";
    return NextResponse.json({ error: `Wgrywanie grafiki nie powiodło się: ${msg}` }, { status: 500 });
  }
}

/** DELETE — przywróć domyślną grafikę (?asset=logo_header). */
export async function DELETE(req: Request) {
  const gate = await requireAdmin("site");
  if (!gate.ok) return gate.response;

  try {
    const url = new URL(req.url);
    const assetRaw = url.searchParams.get("asset");
    if (!assetRaw || !isSiteAssetKey(assetRaw)) {
      return NextResponse.json({ error: "Nieprawidłowy klucz grafiki." }, { status: 400 });
    }
    const assetKey = assetRaw;

    const db = await getDb();
    const settings = await getAppSettings(db);
    const prevUrl = assetUrlFromSettings(settings, assetKey);

    if (isCustomUpload(prevUrl)) {
      await removeStoredSiteAsset(prevUrl);
    }

    await updateAssetColumn(db, assetKey, null);

    const updated = await getAppSettings(db);
    return NextResponse.json({
      ok: true,
      asset: assetKey,
      url: updated.site_assets[assetKey],
      default_url: SITE_ASSET_DEFAULTS[assetKey],
      settings: updated,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "nieznany błąd";
    return NextResponse.json({ error: `Przywracanie grafiki nie powiodło się: ${msg}` }, { status: 500 });
  }
}
