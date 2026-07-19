"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Film, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { GalleryVideoPublic, GalleryVideoRow } from "@/lib/gallery-videos";
import { galleryVideoIdFromStoredUrl } from "@/lib/gallery-videos";
import {
  deleteGalleryVideo,
  fetchAdminGalleryVideos,
  saveGalleryVideo,
} from "@/lib/gallery-video-api";
import {
  emptyGalleryVideoForm,
  GalleryVideoFormModal,
  galleryVideoFormFromRow,
  type GalleryVideoFormState,
} from "@/components/gallery-video-form-modal";
import { PitchCard, PitchPageHero, pitchLabelClass } from "@/components/ui/pitch-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { YoutubeEmbedCard } from "@/components/youtube-embed-card";

function formatMatchDateLabel(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")}.${y}`;
}

function rowToPublic(row: GalleryVideoRow): GalleryVideoPublic | null {
  const youtubeVideoId = galleryVideoIdFromStoredUrl(row.youtube_url);
  if (!youtubeVideoId) return null;
  return {
    id: row.id,
    title: row.title,
    youtubeVideoId,
    matchDate: row.match_date,
  };
}

type Props = {
  videos: GalleryVideoPublic[];
  isAdmin: boolean;
};

export function GaleriaClient({ videos: initialVideos, isAdmin }: Props) {
  const router = useRouter();
  const [videos, setVideos] = useState(initialVideos);
  const [adminRows, setAdminRows] = useState<GalleryVideoRow[]>([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<GalleryVideoFormState>(emptyGalleryVideoForm());

  const loadAdmin = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingAdmin(true);
    try {
      const rows = await fetchAdminGalleryVideos();
      setAdminRows(rows);
      const published = rows
        .filter((r) => r.published === 1)
        .map(rowToPublic)
        .filter((v): v is GalleryVideoPublic => v != null);
      setVideos(published);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nie udało się wczytać galerii");
    } finally {
      setLoadingAdmin(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    void loadAdmin();
  }, [loadAdmin]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyGalleryVideoForm());
    setModalOpen(true);
  }

  function openEdit(id: number) {
    const row = adminRows.find((r) => r.id === id);
    if (!row) return;
    setEditingId(row.id);
    setForm(galleryVideoFormFromRow(row));
    setModalOpen(true);
  }

  async function saveVideo() {
    setBusy(true);
    try {
      await saveGalleryVideo(editingId, form);
      toast.success(editingId != null ? "Link zaktualizowany" : "Link dodany do galerii");
      setModalOpen(false);
      router.refresh();
      await loadAdmin();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nie udało się zapisać");
    } finally {
      setBusy(false);
    }
  }

  async function deleteVideo(id: number, title: string) {
    const ok = window.confirm(`Usunąć «${title}» z galerii?`);
    if (!ok) return;

    setBusy(true);
    try {
      await deleteGalleryVideo(id);
      toast.success("Link usunięty");
      router.refresh();
      await loadAdmin();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nie udało się usunąć");
    } finally {
      setBusy(false);
    }
  }

  const hiddenCount = isAdmin ? adminRows.filter((r) => r.published !== 1).length : 0;

  return (
    <div className="awp-page awp-page--default">
      <PitchPageHero
        title="Galeria meczów"
        subtitle="Nagrania z naszych spotkań na boisku — oglądaj bezpośrednio na stronie Akademii."
      />

      {isAdmin ? (
        <PitchCard className="mt-6 text-left" contentClassName="p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className={pitchLabelClass}>Panel administratora</span>
              <p className="mt-1 text-sm text-emerald-100/90">
                Dodawaj linki do filmów z YouTube — będą widoczne poniżej dla wszystkich odwiedzających.
                {hiddenCount > 0 ? ` (${hiddenCount} ukrytych)` : null}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="pitch" className="gap-2" disabled={busy} onClick={openCreate}>
                <Plus className="h-4 w-4 shrink-0" aria-hidden />
                Dodaj link
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-white/25 bg-black/15 text-white hover:bg-white/10"
                disabled={loadingAdmin || busy}
                onClick={() => void loadAdmin()}
              >
                {loadingAdmin ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : "Odśwież"}
              </Button>
            </div>
          </div>
        </PitchCard>
      ) : null}

      {videos.length === 0 ? (
        <PitchCard className="mt-8 text-left" contentClassName="p-6 sm:p-8">
          <span className={pitchLabelClass}>Brak nagrań</span>
          <p className="mt-4 text-sm leading-relaxed text-emerald-100/90">
            {isAdmin
              ? "Galeria jest pusta — użyj przycisku «Dodaj link» powyżej, aby dodać pierwsze nagranie z meczu."
              : "Wkrótce pojawią się tu filmy z meczów. Wróć później lub sprawdź terminarz nadchodzących spotkań."}
          </p>
        </PitchCard>
      ) : (
        <div className="mt-8 space-y-8">
          {videos.map((video) => {
            const adminRow = adminRows.find((r) => r.id === video.id);
            return (
              <div key={video.id} className="relative">
                {isAdmin && adminRow?.published !== 1 ? (
                  <Badge className="absolute right-3 top-3 z-10 bg-amber-600/90 text-white">Ukryty</Badge>
                ) : null}
                <YoutubeEmbedCard
                  videoId={video.youtubeVideoId}
                  title={video.title}
                  subtitle={
                    video.matchDate
                      ? `Mecz z dnia ${formatMatchDateLabel(video.matchDate)}`
                      : "Nagranie z meczu Akademii Wielkich Piłkarzy"
                  }
                  iframeTitle={`${video.title} — YouTube`}
                />
                {isAdmin ? (
                  <div className="mt-2 flex justify-end gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-white/25 bg-black/15 text-white hover:bg-white/10"
                      disabled={busy}
                      onClick={() => openEdit(video.id)}
                    >
                      <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                      Edytuj
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-red-400/30 bg-red-950/20 text-red-200 hover:bg-red-950/40"
                      disabled={busy}
                      onClick={() => void deleteVideo(video.id, video.title)}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                      Usuń
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {isAdmin && adminRows.some((r) => r.published !== 1) ? (
        <PitchCard className="mt-8 text-left" contentClassName="p-5">
          <span className={pitchLabelClass}>Ukryte wpisy (tylko admin)</span>
          <ul className="mt-3 space-y-2 text-sm text-emerald-100/90">
            {adminRows
              .filter((r) => r.published !== 1)
              .map((row) => (
                <li key={row.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>{row.title}</span>
                  <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => openEdit(row.id)}>
                    Edytuj
                  </Button>
                </li>
              ))}
          </ul>
        </PitchCard>
      ) : null}

      <p className="mt-10 flex items-center justify-center gap-2 text-center text-sm text-zinc-600 dark:text-zinc-400">
        <Film className="h-4 w-4 shrink-0" aria-hidden />
        Filmy hostowane na YouTube — odtwarzane w osadzeniu na stronie.
      </p>

      {isAdmin ? (
        <GalleryVideoFormModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          editingId={editingId}
          form={form}
          onFormChange={setForm}
          busy={busy}
          onSave={() => void saveVideo()}
        />
      ) : null}
    </div>
  );
}
