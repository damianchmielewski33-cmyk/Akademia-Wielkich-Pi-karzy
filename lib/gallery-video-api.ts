import type { GalleryVideoRow } from "@/lib/gallery-videos";
import type { GalleryVideoFormState } from "@/components/gallery-video-form-modal";

export function galleryVideoPayloadFromForm(form: GalleryVideoFormState) {
  const sortOrder = Number(form.sort_order);
  if (!Number.isFinite(sortOrder)) {
    throw new Error("Kolejność musi być liczbą");
  }
  const title = form.title.trim();
  const youtube_url = form.youtube_url.trim();
  if (!title || !youtube_url) {
    throw new Error("Podaj tytuł i link YouTube");
  }
  return {
    title,
    youtube_url,
    match_date: form.match_date.trim() || null,
    sort_order: sortOrder,
    published: form.published ? 1 : 0,
  };
}

export async function fetchAdminGalleryVideos(): Promise<GalleryVideoRow[]> {
  const res = await fetch("/api/admin/gallery-videos");
  const data = (await res.json().catch(() => ({}))) as { videos?: GalleryVideoRow[]; error?: string };
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Nie udało się wczytać galerii");
  }
  return data.videos ?? [];
}

export async function saveGalleryVideo(editingId: number | null, form: GalleryVideoFormState): Promise<void> {
  const payload = galleryVideoPayloadFromForm(form);
  const res = await fetch(
    editingId != null ? `/api/admin/gallery-videos/${editingId}` : "/api/admin/gallery-videos",
    {
      method: editingId != null ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Nie udało się zapisać");
  }
}

export async function deleteGalleryVideo(id: number): Promise<void> {
  const res = await fetch(`/api/admin/gallery-videos/${id}`, { method: "DELETE" });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Nie udało się usunąć");
  }
}
