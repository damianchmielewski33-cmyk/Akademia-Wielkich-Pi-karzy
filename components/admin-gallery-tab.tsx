"use client";

import { useCallback, useEffect, useState } from "react";
import { Film, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AdminCard,
  AdminTableShell,
  adminEmptyStateClass,
  adminFieldClass,
  adminOutlineBtnClass,
} from "@/components/admin-ui";
import { AppModal } from "@/components/ui/app-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { GalleryVideoRow } from "@/lib/gallery-videos";
import { galleryVideoIdFromStoredUrl } from "@/lib/gallery-videos";

type FormState = {
  title: string;
  youtube_url: string;
  match_date: string;
  sort_order: string;
  published: boolean;
};

const emptyForm = (): FormState => ({
  title: "",
  youtube_url: "",
  match_date: "",
  sort_order: "0",
  published: true,
});

function formFromRow(row: GalleryVideoRow): FormState {
  return {
    title: row.title,
    youtube_url: row.youtube_url,
    match_date: row.match_date ?? "",
    sort_order: String(row.sort_order),
    published: row.published === 1,
  };
}

function formatDateDisplay(iso: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}

export function AdminGalleryTab() {
  const [videos, setVideos] = useState<GalleryVideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/gallery-videos");
      const data = (await res.json().catch(() => ({}))) as { videos?: GalleryVideoRow[]; error?: string };
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Nie udało się wczytać galerii");
        return;
      }
      setVideos(data.videos ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setModalOpen(true);
  }

  function openEdit(row: GalleryVideoRow) {
    setEditingId(row.id);
    setForm(formFromRow(row));
    setModalOpen(true);
  }

  async function saveVideo() {
    const title = form.title.trim();
    const youtube_url = form.youtube_url.trim();
    if (!title || !youtube_url) {
      toast.error("Podaj tytuł i link YouTube");
      return;
    }

    const sortOrder = Number(form.sort_order);
    if (!Number.isFinite(sortOrder)) {
      toast.error("Kolejność musi być liczbą");
      return;
    }

    const payload = {
      title,
      youtube_url,
      match_date: form.match_date.trim() || null,
      sort_order: sortOrder,
      published: form.published ? 1 : 0,
    };

    setBusy(true);
    try {
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
        toast.error(typeof data.error === "string" ? data.error : "Nie udało się zapisać");
        return;
      }
      toast.success(editingId != null ? "Film zaktualizowany" : "Film dodany do galerii");
      setModalOpen(false);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function deleteVideo(row: GalleryVideoRow) {
    const ok = window.confirm(`Usunąć film «${row.title}» z galerii?`);
    if (!ok) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/admin/gallery-videos/${row.id}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Nie udało się usunąć");
        return;
      }
      toast.success("Film usunięty");
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <AdminCard
        title="Galeria meczów"
        description="Filmy z YouTube widoczne publicznie na stronie /galeria. Wyższa kolejność = wyżej na liście."
      >
        <div className="mb-4 flex flex-wrap gap-2">
          <Button type="button" variant="stadium" className="gap-2" disabled={busy} onClick={openCreate}>
            <Plus className="h-4 w-4 shrink-0" aria-hidden />
            Dodaj film
          </Button>
          <Button
            type="button"
            variant="outline"
            className={adminOutlineBtnClass}
            disabled={loading || busy}
            onClick={() => void load()}
          >
            Odśwież
          </Button>
        </div>

        {loading ? (
          <p className="flex items-center gap-2 text-sm pitch-muted">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Wczytywanie…
          </p>
        ) : videos.length === 0 ? (
          <div className={adminEmptyStateClass}>
            <Film className="mx-auto mb-2 h-8 w-8 opacity-60" aria-hidden />
            Brak filmów w galerii. Dodaj pierwsze nagranie z meczu.
          </div>
        ) : (
          <AdminTableShell>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tytuł</TableHead>
                  <TableHead>Data meczu</TableHead>
                  <TableHead className="text-right">Kolejność</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {videos.map((row) => {
                  const ytId = galleryVideoIdFromStoredUrl(row.youtube_url);
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="max-w-[16rem]">
                        <span className="font-medium text-white">{row.title}</span>
                        {ytId ? (
                          <span className="mt-0.5 block truncate font-mono text-xs text-emerald-100/60">{ytId}</span>
                        ) : (
                          <span className="mt-0.5 block text-xs text-amber-300">Nieprawidłowy link YouTube</span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums">{formatDateDisplay(row.match_date)}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.sort_order}</TableCell>
                      <TableCell>
                        {row.published === 1 ? (
                          <Badge className="bg-emerald-900/60 text-emerald-100">Publiczny</Badge>
                        ) : (
                          <Badge variant="secondary">Ukryty</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-emerald-100"
                            disabled={busy}
                            onClick={() => openEdit(row)}
                            aria-label={`Edytuj ${row.title}`}
                          >
                            <Pencil className="h-4 w-4" aria-hidden />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-300 hover:text-red-200"
                            disabled={busy}
                            onClick={() => void deleteVideo(row)}
                            aria-label={`Usuń ${row.title}`}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </AdminTableShell>
        )}
      </AdminCard>

      <AppModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        size="md"
        scrollable
        title={editingId != null ? "Edytuj film" : "Dodaj film do galerii"}
        description="Link z YouTube — film będzie osadzony na stronie Galeria, tak jak transmisja na stronie głównej."
        footer={
          <>
            <Button type="button" variant="outline" disabled={busy} onClick={() => setModalOpen(false)}>
              Anuluj
            </Button>
            <Button type="button" variant="stadium" disabled={busy} onClick={() => void saveVideo()}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              {editingId != null ? "Zapisz zmiany" : "Dodaj film"}
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
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
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
              onChange={(e) => setForm((f) => ({ ...f, youtube_url: e.target.value }))}
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
                onChange={(e) => setForm((f) => ({ ...f, match_date: e.target.value }))}
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
                onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
              />
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-emerald-100/90">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-white/30 bg-black/20"
              checked={form.published}
              disabled={busy}
              onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
            />
            Widoczny publicznie na stronie Galeria
          </label>
        </div>
      </AppModal>
    </>
  );
}
