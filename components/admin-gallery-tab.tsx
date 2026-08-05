"use client";

import { useCallback, useEffect, useState } from "react";
import { Film, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "@/lib/app-toast";
import {
  AdminCard,
  AdminTableShell,
  AdminToolbar,
  adminEmptyStateClass,
} from "@/components/admin-ui";
import { AdminRowActions } from "@/components/admin-row-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  emptyGalleryVideoForm,
  GalleryVideoFormModal,
  galleryVideoFormFromRow,
  type GalleryVideoFormState,
} from "@/components/gallery-video-form-modal";
import type { GalleryVideoRow } from "@/lib/gallery-videos";
import { galleryVideoIdFromStoredUrl } from "@/lib/gallery-videos";
import {
  deleteGalleryVideo,
  fetchAdminGalleryVideos,
  saveGalleryVideo,
} from "@/lib/gallery-video-api";

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
  const [form, setForm] = useState<GalleryVideoFormState>(emptyGalleryVideoForm());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setVideos(await fetchAdminGalleryVideos());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nie udało się wczytać galerii");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyGalleryVideoForm());
    setModalOpen(true);
  }

  function openEdit(row: GalleryVideoRow) {
    setEditingId(row.id);
    setForm(galleryVideoFormFromRow(row));
    setModalOpen(true);
  }

  async function saveVideo() {
    setBusy(true);
    try {
      await saveGalleryVideo(editingId, form);
      toast.success(editingId != null ? "Film zaktualizowany" : "Link dodany do galerii");
      setModalOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nie udało się zapisać");
    } finally {
      setBusy(false);
    }
  }

  async function deleteVideo(row: GalleryVideoRow) {
    const ok = window.confirm(`Usunąć film «${row.title}» z galerii?`);
    if (!ok) return;

    setBusy(true);
    try {
      await deleteGalleryVideo(row.id);
      toast.success("Film usunięty");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nie udało się usunąć");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <AdminToolbar
        title="Galeria meczów"
        description="Filmy z YouTube widoczne publicznie na stronie /galeria. Wyższa kolejność = wyżej na liście."
        onReload={() => void load()}
        loading={loading || busy}
      >
        <Button type="button" size="sm" className="gap-2" disabled={busy} onClick={openCreate}>
          <Plus className="h-4 w-4 shrink-0" aria-hidden />
          Dodaj link
        </Button>
      </AdminToolbar>

      <AdminCard title="Filmy" description="Lista nagrania — edycja i publikacja.">
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
                          <span className="mt-0.5 block truncate font-mono text-xs text-emerald-100/60">
                            {ytId}
                          </span>
                        ) : (
                          <span className="mt-0.5 block text-xs text-amber-300">
                            Nieprawidłowy link YouTube
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums">
                        {formatDateDisplay(row.match_date)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{row.sort_order}</TableCell>
                      <TableCell>
                        {row.published === 1 ? (
                          <Badge className="bg-emerald-900/60 text-emerald-100">Publiczny</Badge>
                        ) : (
                          <Badge variant="secondary">Ukryty</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <AdminRowActions
                          primary={
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              disabled={busy}
                              onClick={() => openEdit(row)}
                              className="gap-1.5"
                            >
                              <Pencil className="h-3.5 w-3.5" aria-hidden />
                              Edytuj
                            </Button>
                          }
                          dangerItems={[
                            {
                              label: "Usuń",
                              destructive: true,
                              disabled: busy,
                              onClick: () => void deleteVideo(row),
                            },
                          ]}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </AdminTableShell>
        )}
      </AdminCard>

      <GalleryVideoFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        editingId={editingId}
        form={form}
        onFormChange={setForm}
        busy={busy}
        onSave={() => void saveVideo()}
      />
    </>
  );
}
