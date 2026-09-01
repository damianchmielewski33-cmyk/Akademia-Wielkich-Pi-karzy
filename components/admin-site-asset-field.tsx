"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw, Upload } from "lucide-react";
import { toast } from "@/lib/app-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  SITE_ASSET_DEFAULTS,
  SITE_ASSET_META,
  siteAssetNeedsUnoptimized,
  type SiteAssetKey,
} from "@/lib/site-assets";
import { SITE_ASSET_UPLOAD_SPECS } from "@/lib/image-upload-specs";
import { ImageUploadSpecDetails } from "@/components/admin-image-specs";
import type { AppSettings } from "@/lib/app-settings";
import { adminInnerPanelClass } from "@/components/admin-ui";
import { formatBytesMb, prepareImageForUpload } from "@/lib/prepare-image-for-upload";

type Props = {
  assetKey: SiteAssetKey;
  currentUrl: string;
  customUrl: string | null;
  disabled?: boolean;
  onUpdated: (settings: AppSettings) => void;
};

const MAX_UPLOAD_BYTES = Math.floor(3.5 * 1024 * 1024);

export function AdminSiteAssetField({ assetKey, currentUrl, customUrl, disabled, onUpdated }: Props) {
  const meta = SITE_ASSET_META[assetKey];
  const spec = SITE_ASSET_UPLOAD_SPECS[assetKey];
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function upload(file: File) {
    setBusy(true);
    try {
      let prepared;
      try {
        prepared = await prepareImageForUpload(file, {
          maxBytes: MAX_UPLOAD_BYTES,
          maxEdge: assetKey.startsWith("bg_") ? 2560 : 1600,
          preferMime: assetKey.startsWith("bg_") ? "image/jpeg" : "image/webp",
        });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Nie udało się przygotować zdjęcia");
        return;
      }

      if (prepared.resized) {
        toast.message(
          `Zmniejszono zdjęcie: ${formatBytesMb(prepared.originalBytes)} → ${formatBytesMb(prepared.finalBytes)}`
        );
      }

      const form = new FormData();
      form.set("asset", assetKey);
      form.set("file", prepared.file);
      const res = await fetch("/api/admin/site-assets", { method: "POST", body: form });
      const raw = await res.text();
      let j: { error?: string; settings?: AppSettings } = {};
      try {
        j = raw ? (JSON.parse(raw) as { error?: string; settings?: AppSettings }) : {};
      } catch {
        /* odpowiedź nie-JSON (np. limity platformy) */
      }
      if (!res.ok) {
        if (typeof j.error === "string" && j.error.trim()) {
          toast.error(j.error);
        } else if (res.status === 413) {
          toast.error("Plik za duży dla serwera — spróbuj ponownie lub wybierz inny kadr.");
        } else if (res.status === 503) {
          toast.error("Magazyn grafik niedostępny — na Vercel dodaj BLOB_READ_WRITE_TOKEN.");
        } else {
          toast.error(`Nie udało się wgrać grafiki (HTTP ${res.status}).`);
        }
        return;
      }
      if (j.settings) {
        onUpdated(j.settings);
        router.refresh();
      }
      toast.success(`Zapisano: ${meta.label}`);
    } catch {
      toast.error("Błąd połączenia");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function resetToDefault() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/site-assets?asset=${encodeURIComponent(assetKey)}`, {
        method: "DELETE",
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string; settings?: AppSettings };
      if (!res.ok) {
        toast.error(typeof j.error === "string" ? j.error : "Nie udało się przywrócić domyślnej grafiki");
        return;
      }
      if (j.settings) {
        onUpdated(j.settings);
        router.refresh();
      }
      toast.success(`Przywrócono domyślną grafikę: ${meta.label}`);
    } catch {
      toast.error("Błąd połączenia");
    } finally {
      setBusy(false);
    }
  }

  const isCustom = Boolean(customUrl?.trim());
  const previewSrc = currentUrl || SITE_ASSET_DEFAULTS[assetKey];

  return (
    <div className={cn(adminInnerPanelClass, "space-y-3")}>
      <div>
        <p className="text-sm font-semibold text-zinc-950 dark:text-white">{meta.label}</p>
        <p className="mt-0.5 text-xs text-zinc-500">{meta.hint}</p>
      </div>

      <ImageUploadSpecDetails spec={spec} compact />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div
          className={cn(
            "relative flex h-28 w-full shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 sm:h-32 sm:w-44",
            assetKey.startsWith("bg_") && "sm:h-24 sm:w-56"
          )}
        >
          <Image
            src={previewSrc}
            alt={meta.label}
            fill
            className={cn(
              "object-contain object-center p-2",
              assetKey.startsWith("bg_") && "object-cover"
            )}
            sizes="176px"
            unoptimized={siteAssetNeedsUnoptimized(previewSrc)}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            {isCustom ? "Używasz własnej grafiki" : "Używana jest grafika domyślna"}
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
            className="hidden"
            disabled={disabled || busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="default"
              size="sm"
              className="rounded-full font-bold"
              disabled={disabled || busy}
              onClick={() => inputRef.current?.click()}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Upload className="h-4 w-4" aria-hidden />
              )}
              Wgraj nową grafikę
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              className="rounded-full font-bold"
              disabled={disabled || busy || !isCustom}
              onClick={() => void resetToDefault()}
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              Przywróć domyślną
            </Button>
          </div>
          <p className="text-xs text-zinc-500">
            Akceptowane: {spec.formats} · limit serwera 3,5 MB
            {assetKey.startsWith("bg_")
              ? " · zbyt duże zdjęcia strona zmniejszy automatycznie"
              : " · duże pliki są automatycznie zmniejszane"}
          </p>
        </div>
      </div>
    </div>
  );
}
