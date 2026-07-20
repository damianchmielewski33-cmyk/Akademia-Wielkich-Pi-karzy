"use client";

import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { ModalAlert } from "@/components/ui/modal-shared";

type Props = {
  open: boolean;
  matchLabel: string;
  reason: string;
  onClose: () => void;
};

export function MatchCancelledNoticeModal({ open, matchLabel, reason, onClose }: Props) {
  return (
    <AppModal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      size="sm"
      title="Mecz został anulowany"
      footer={
        <Button type="button" variant="stadium" onClick={onClose}>
          Rozumiem
        </Button>
      }
    >
      <ModalAlert tone="warning">
        <p className="font-semibold">{matchLabel}</p>
        <p className="mt-2 text-sm">Powód: {reason}</p>
      </ModalAlert>
      <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
        Jeśli byłeś zapisany na ten termin, organizator został o tym poinformowany. Sprawdź terminarz pod kątem
        nowych dat.
      </p>
    </AppModal>
  );
}
