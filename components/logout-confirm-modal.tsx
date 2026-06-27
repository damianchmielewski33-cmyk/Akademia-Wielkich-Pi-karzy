"use client";

import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function LogoutConfirmModal({ open, onOpenChange }: Props) {
  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title="Wylogować się?"
      description="Czy na pewno chcesz zakończyć sesję?"
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Nie
          </Button>
          <Button type="button" variant="destructive" asChild>
            <a href="/api/auth/logout">Tak</a>
          </Button>
        </>
      }
    />
  );
}
