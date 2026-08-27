"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, RotateCcw, Upload } from "lucide-react";
import { toast } from "@/lib/app-toast";
import { useMarketplacePhotos } from "@/components/marketplace-photos-provider";
import { MarketplacePitchPhoto } from "@/components/marketplace-pitch-photo";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { canOptimizeMarketplacePhoto, MARKETPLACE_STRIP_VISIBLE } from "@/lib/marketplace-photos";
import { formatBytesMb, prepareImageForUpload } from "@/lib/prepare-image-for-upload";
import { siteAssetNeedsUnoptimized } from "@/lib/site-assets";
import { cn } from "@/lib/utils";
import type { AppSettings } from "@/lib/app-settings";

const MAX_UPLOAD_BYTES = Math.floor(3.5 * 1024 * 1024);

type EditResult = {
  photos: string[];
  custom: (string | null)[];
  settings?: AppSettings;
};

async function uploadSlot(index: number, file: File): Promise<EditResult | null> {
  const form = new FormData();
  form.set("index", String(index));
  form.set("file", file);
  const res = await fetch("/api/admin/marketplace-pitch-photos", { method: "POST", body: form });
  const j = (await res.json().catch(() => ({}))) as {
    error?: string;
    photos?: string[];
    custom?: (string | null)[];
    settings?: AppSettings;
  };
  if (!res.ok) {
    toast.error(typeof j.error === "string" ? j.error : "Nie udało się wgrać zdjęcia");
    return null;
  }
  if (!j.photos || !j.custom) {
    toast.error("Brak danych po zapisie");
    return null;
  }
  toast.success(`Zapisano zdjęcie ${index + 1}`);
  return { photos: j.photos, custom: j.custom, settings: j.settings };
}

async function resetSlot(index: number): Promise<EditResult | null> {
  const res = await fetch(`/api/admin/marketplace-pitch-photos?index=${index}`, { method: "DELETE" });
  const j = (await res.json().catch(() => ({}))) as {
    error?: string;
    photos?: string[];
    custom?: (string | null)[];
    settings?: AppSettings;
  };
  if (!res.ok) {
    toast.error(typeof j.error === "string" ? j.error : "Nie udało się przywrócić zdjęcia");
    return null;
  }
  if (!j.photos || !j.custom) {
    toast.error("Brak danych po przywróceniu");
    return null;
  }
  toast.success(`Przywrócono domyślne zdjęcie ${index + 1}`);
  return { photos: j.photos, custom: j.custom, settings: j.settings };
}

export function MarketplacePitchPhotoEditModal({
  open,
  index,
  onOpenChange,
  onUpdated,
}: {
  open: boolean;
  index: number | null;
  onOpenChange: (open: boolean) => void;
  onUpdated?: (settings: AppSettings) => void;
}) {
  const router = useRouter();
  const { photos, customSlots, applyUpdate } = useMarketplacePhotos();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const slot = index ?? 0;
  const preview = photos[slot] ?? "";
  const isCustom = Boolean(customSlots[slot]?.trim());

  async function handleFile(file: File) {
    setBusy(true);
    try {
      let prepared;
      try {
        prepared = await prepareImageForUpload(file, {
          maxBytes: MAX_UPLOAD_BYTES,
          maxEdge: 2560,
          preferMime: "image/jpeg",
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

      const result = await uploadSlot(slot, prepared.file);
      if (!result) return;
      applyUpdate(result.photos, result.custom);
      if (result.settings) onUpdated?.(result.settings);
      router.refresh();
      onOpenChange(false);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleReset() {
    setBusy(true);
    try {
      const result = await resetSlot(slot);
      if (!result) return;
      applyUpdate(result.photos, result.custom);
      if (result.settings) onUpdated?.(result.settings);
      router.refresh();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppModal
      open={open && index != null}
      onOpenChange={onOpenChange}
      title={`Zdjęcie ${slot + 1}`}
      description="Widać je na pasku pod „Gramy razem”, w hero i na kafelkach V2."
      size="md"
    >
      <div className="space-y-4">
        <div className="relative aspect-[3/2] w-full overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-900">
          {preview ? (
            <Image
              src={preview}
              alt=""
              fill
              className="object-cover"
              sizes="480px"
              unoptimized={
                siteAssetNeedsUnoptimized(preview) || !canOptimizeMarketplacePhoto(preview)
              }
            />
          ) : null}
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {isCustom ? "Używasz własnego zdjęcia." : "Aktualnie widać zdjęcie domyślne."}{" "}
          Duże pliki (powyżej 3,5 MB) strona automatycznie zmniejszy przed wgraniem.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={busy} className="rounded-full font-bold" onClick={() => inputRef.current?.click()}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <Upload className="mr-2 h-4 w-4" aria-hidden />}
            Wgraj nowe
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy || !isCustom}
            className="rounded-full font-bold"
            onClick={() => void handleReset()}
          >
            <RotateCcw className="mr-2 h-4 w-4" aria-hidden />
            Przywróć domyślne
          </Button>
        </div>
      </div>
    </AppModal>
  );
}

/** Poziomy pasek zdjęć pod hero „Gramy razem” — admin klika, aby edytować. */
export function MarketplacePhotoStrip({
  isAdmin = false,
  className,
  limit = MARKETPLACE_STRIP_VISIBLE,
}: {
  isAdmin?: boolean;
  className?: string;
  limit?: number;
}) {
  const { photos } = useMarketplacePhotos();
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const list = photos.slice(0, limit);

  return (
    <>
      <div
        className={cn(
          "-mx-4 mt-0 flex gap-2.5 overflow-x-auto bg-zinc-100 px-4 py-3 [scrollbar-width:thin] dark:bg-zinc-900 sm:gap-3 sm:py-3.5 md:gap-4 md:py-4",
          className
        )}
      >
        {list.map((src, i) =>
          isAdmin ? (
            <button
              key={`${i}-${src}`}
              type="button"
              onClick={() => setEditIndex(i)}
              className="group relative h-28 w-44 shrink-0 overflow-hidden rounded-2xl bg-zinc-200 text-left ring-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mp-teal)] sm:h-36 sm:w-56 sm:rounded-[1.35rem] md:h-48 md:w-72 md:rounded-3xl"
              title="Edytuj zdjęcie"
              aria-label={`Edytuj zdjęcie ${i + 1}`}
            >
              <MarketplacePitchPhoto src={src} sizes="(max-width: 640px) 176px, (max-width: 768px) 224px, 288px" />
              <span className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/35" />
              <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-zinc-950 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                <Pencil className="h-3.5 w-3.5" aria-hidden />
                Edytuj
              </span>
            </button>
          ) : (
            <div key={`${i}-${src}`} className="relative h-28 w-44 shrink-0 overflow-hidden rounded-2xl bg-zinc-200 sm:h-36 sm:w-56 sm:rounded-[1.35rem] md:h-48 md:w-72 md:rounded-3xl">
              <MarketplacePitchPhoto src={src} sizes="(max-width: 640px) 176px, (max-width: 768px) 224px, 288px" />
            </div>
          )
        )}
      </div>
      {isAdmin ? (
        <MarketplacePitchPhotoEditModal open={editIndex != null} index={editIndex} onOpenChange={(o) => !o && setEditIndex(null)} />
      ) : null}
    </>
  );
}

/** Siatka wszystkich slotów w panelu admina. */
export function AdminMarketplacePitchPhotosSection({
  onUpdated,
  disabled,
}: {
  onUpdated?: (settings: AppSettings) => void;
  disabled?: boolean;
}) {
  const { photos, customSlots, applyUpdate } = useMarketplacePhotos();
  const [busyIndex, setBusyIndex] = useState<number | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  async function onPick(index: number, file: File) {
    setBusyIndex(index);
    try {
      let prepared;
      try {
        prepared = await prepareImageForUpload(file, {
          maxBytes: MAX_UPLOAD_BYTES,
          maxEdge: 2560,
          preferMime: "image/jpeg",
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
      const result = await uploadSlot(index, prepared.file);
      if (!result) return;
      applyUpdate(result.photos, result.custom);
      if (result.settings) onUpdated?.(result.settings);
    } finally {
      setBusyIndex(null);
    }
  }

  async function onReset(index: number) {
    setBusyIndex(index);
    try {
      const result = await resetSlot(index);
      if (!result) return;
      applyUpdate(result.photos, result.custom);
      if (result.settings) onUpdated?.(result.settings);
    } finally {
      setBusyIndex(null);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-emerald-100/85">
        Zdjęcia paska pod „Gramy razem” (V2) oraz puli hero/kafelków. Kliknij też zdjęcie na stronie głównej lub w
        terminarzu, aby je zmienić. Pliki powyżej 3,5 MB są automatycznie zmniejszane przed wgraniem.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {photos.map((src, i) => {
          const busy = busyIndex === i;
          const isCustom = Boolean(customSlots[i]?.trim());
          return (
            <div key={i} className="overflow-hidden rounded-xl border border-white/20 bg-black/20">
              <div className="relative aspect-[3/2] bg-black/30">
                <Image
                  src={src}
                  alt={`Zdjęcie ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="280px"
                  unoptimized={siteAssetNeedsUnoptimized(src) || !canOptimizeMarketplacePhoto(src)}
                />
              </div>
              <div className="space-y-2 p-3">
                <p className="text-sm font-semibold text-white">
                  Zdjęcie {i + 1}
                  <span className="ml-2 text-xs font-normal text-emerald-100/70">
                    {isCustom ? "własne" : "domyślne"}
                  </span>
                </p>
                <input
                  ref={(el) => {
                    inputRefs.current[i] = el;
                  }}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  disabled={disabled || busy}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onPick(i, f);
                    e.target.value = "";
                  }}
                />
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    type="button"
                    variant="gold"
                    size="sm"
                    disabled={disabled || busy}
                    onClick={() => inputRefs.current[i]?.click()}
                  >
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Upload className="h-3.5 w-3.5" aria-hidden />}
                    Wgraj
                  </Button>
                  <Button
                    type="button"
                    variant="gold"
                    size="sm"
                    disabled={disabled || busy || !isCustom}
                    onClick={() => void onReset(i)}
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                    Domyślne
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
