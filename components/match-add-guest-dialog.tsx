"use client";

import { useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import type { MatchRow } from "@/lib/db";
import { AppModal } from "@/components/ui/app-modal";
import { FormInput } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import { ModalMatchSummary } from "@/components/ui/modal-shared";
import { formSchemas, useValidatedForm } from "@/lib/form-validation";
import { modalPanelClass } from "@/components/ui/modal-shared";
import { cn } from "@/lib/utils";

const guestSchema = z.object({
  guestFirst: formSchemas.requiredName("Imię"),
  guestLast: formSchemas.requiredName("Nazwisko"),
  guestAlias: formSchemas.playerAlias,
});

async function fetchJson<T>(
  url: string,
  init?: RequestInit
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(url, init);
    const json = (await res.json().catch(() => null)) as unknown;
    if (!res.ok) {
      const msg = (json as { error?: unknown } | null)?.error;
      return { ok: false, error: typeof msg === "string" ? msg : "Nie udało się wykonać operacji" };
    }
    return { ok: true, data: json as T };
  } catch {
    return { ok: false, error: "Błąd sieci" };
  }
}

type Props = {
  match: MatchRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
  /** Domyślnie endpoint dla zalogowanego gracza. */
  apiPath?: (matchId: number) => string;
};

export function MatchAddGuestDialog({
  match,
  open,
  onOpenChange,
  onDone,
  apiPath = (id) => `/api/terminarz/match/${id}/add-guest`,
}: Props) {
  const guestForm = useValidatedForm({
    initialValues: { guestFirst: "", guestLast: "", guestAlias: "" },
    schema: guestSchema,
  });
  const [busy, setBusy] = useState(false);

  function handleOpenChange(next: boolean) {
    if (!next) guestForm.reset({ guestFirst: "", guestLast: "", guestAlias: "" });
    onOpenChange(next);
  }

  async function addGuest() {
    if (!match || !guestForm.validate()) return;
    const { guestFirst, guestLast, guestAlias } = guestForm.values;
    setBusy(true);
    try {
      const r = await fetchJson<{ ok: true }>(apiPath(match.id), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: guestFirst.trim(),
          last_name: guestLast.trim(),
          player_alias: guestAlias.trim(),
        }),
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Gość zapisany na mecz");
      guestForm.reset({ guestFirst: "", guestLast: "", guestAlias: "" });
      handleOpenChange(false);
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppModal
      open={open}
      onOpenChange={handleOpenChange}
      size="md"
      scrollable
      title="Dodaj gościa na mecz"
      description="Zapisz osobę grającą jednorazowo. Gość zostanie automatycznie usunięty dopiero, gdy saldo jego portfela wyniesie 0."
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={busy}>
            Anuluj
          </Button>
          <Button type="button" variant="pitch" disabled={busy} onClick={() => void addGuest()}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            <UserPlus className="mr-2 h-4 w-4" aria-hidden />
            Dodaj gościa
          </Button>
        </>
      }
    >
      {match ? <ModalMatchSummary match={match} /> : null}
      <div className={cn(modalPanelClass, "mt-4 space-y-3")}>
        <FormInput
          id="ag-gfirst"
          label="Imię"
          required
          value={guestForm.values.guestFirst}
          onChange={(e) => guestForm.setValue("guestFirst", e.target.value)}
          onBlur={() => guestForm.setFieldTouched("guestFirst")}
          error={guestForm.errors.guestFirst}
          disabled={busy}
        />
        <FormInput
          id="ag-glast"
          label="Nazwisko"
          required
          value={guestForm.values.guestLast}
          onChange={(e) => guestForm.setValue("guestLast", e.target.value)}
          onBlur={() => guestForm.setFieldTouched("guestLast")}
          error={guestForm.errors.guestLast}
          disabled={busy}
        />
        <FormInput
          id="ag-galias"
          label="Pseudonim (unikalny)"
          required
          value={guestForm.values.guestAlias}
          onChange={(e) => guestForm.setValue("guestAlias", e.target.value)}
          onBlur={() => guestForm.setFieldTouched("guestAlias")}
          error={guestForm.errors.guestAlias}
          disabled={busy}
        />
      </div>
    </AppModal>
  );
}
