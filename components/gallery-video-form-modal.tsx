"use client";

import { Loader2 } from "lucide-react";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminFieldClass } from "@/components/admin-ui";
import type { GalleryVideoRow } from "@/lib/gallery-videos";

export type GalleryVideoFormState = {
  title: string;
  youtube_url: string;
  match_date: string;
  sort_order: string;
  published: boolean;
};

export const emptyGalleryVideoForm = (): GalleryVideoFormState => ({
  title: "",
  youtube_url: "",
  match_date: "",
  sort_order: "0",
  published: true,
});

export function galleryVideoFormFromRow(row: GalleryVideoRow): GalleryVideoFormState {
  return {
    title: row.title,
    youtube_url: row.youtube_url,
    match_date: row.match_date ?? "",
    sort_order: String(row.sort_order),
    published: row.published === 1,
  };
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingId: number | null;
  form: GalleryVideoFormState;
  onFormChange: (next: GalleryVideoFormState) => void;
  busy: boolean;
  onSave: () => void;
};

export function GalleryVideoFormModal({
  open,
  onOpenChange,
  editingId,
  form,
  onFormChange,
  busy,
  onSave,
}: Props) {
  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      scrollable
      title={editingId != null ? "Edytuj link do filmu" : "Dodaj link do galerii"}
      description="Wklej link z YouTube — film pojawi się na stronie Galeria meczów jako osadzenie."
      footer={
        <>
          <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button type="button" variant="pitch" disabled={busy} onClick={onSave}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            {editingId != null ? "Zapisz zmiany" : "Dodaj link"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-1.5">
          <Label htmlFor="gallery-title">Tytuł</Label>
          <Input
            id="gallery-title"
            className={adminFieldClass}
            value={form.title}
            disabled={busy}
            placeholder="np. Mecz wiosenny 2025"
            onChange={(e) => onFormChange({ ...form, title: e.target.value })}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="gallery-yt">Link lub ID YouTube</Label>
          <Input
            id="gallery-yt"
            className={adminFieldClass}
            value={form.youtube_url}
            disabled={busy}
            placeholder="https://www.youtube.com/watch?v=…"
            onChange={(e) => onFormChange({ ...form, youtube_url: e.target.value })}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="gallery-date">Data meczu (opcjonalnie)</Label>
            <Input
              id="gallery-date"
              type="date"
              className={adminFieldClass}
              value={form.match_date}
              disabled={busy}
              onChange={(e) => onFormChange({ ...form, match_date: e.target.value })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="gallery-order">Kolejność</Label>
            <Input
              id="gallery-order"
              type="number"
              className={adminFieldClass}
              value={form.sort_order}
              disabled={busy}
              onChange={(e) => onFormChange({ ...form, sort_order: e.target.value })}
            />
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-emerald-100/90">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-white/30 bg-black/20"
            checked={form.published}
            disabled={busy}
            onChange={(e) => onFormChange({ ...form, published: e.target.checked })}
          />
          Widoczny publicznie na stronie Galeria
        </label>
      </div>
    </AppModal>
  );
}
