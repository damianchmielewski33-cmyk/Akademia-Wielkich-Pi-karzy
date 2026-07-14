"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw, Upload } from "lucide-react";
import { toast } from "sonner";
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

type Props = {
  assetKey: SiteAssetKey;
  currentUrl: string;
  customUrl: string | null;
  disabled?: boolean;
  onUpdated: (settings: AppSettings) => void;
};

export function AdminSiteAssetField({ assetKey, currentUrl, customUrl, disabled, onUpdated }: Props) {
  const meta = SITE_ASSET_META[assetKey];
  const spec = SITE_ASSET_UPLOAD_SPECS[assetKey];
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function upload(file: File) {
    setBusy(true);
    try {
      const form = new FormData();
      form.set("asset", assetKey);
      form.set("file", file);
      const res = await fetch("/api/admin/site-assets", { method: "POST", body: form });
      const j = (await res.json().catch(() => ({}))) as { error?: string; settings?: AppSettings };
      if (!res.ok) {
        toast.error(typeof j.error === "string" ? j.error : "Nie udało się wgrać grafiki");
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
        <p className="text-sm font-semibold text-white">{meta.label}</p>
        <p className="mt-0.5 text-xs pitch-muted">{meta.hint}</p>
      </div>

      <ImageUploadSpecDetails spec={spec} compact />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div
          className={cn(
            "relative flex h-28 w-full shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/20 bg-black/20 sm:h-32 sm:w-44",
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
          <p className="text-sm text-emerald-100/85">
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
              variant="stadium"
              size="sm"
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
              variant="pitch"
              size="sm"
              disabled={disabled || busy || !isCustom}
              onClick={() => void resetToDefault()}
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              Przywróć domyślną
            </Button>
          </div>
          <p className="text-xs text-emerald-100/60">
            Akceptowane: {spec.formats} · maks. {spec.maxFileSize}
          </p>
        </div>
      </div>
    </div>
  );
}
