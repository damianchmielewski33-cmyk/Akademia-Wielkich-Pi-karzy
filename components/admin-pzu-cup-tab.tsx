"use client";

import Link from "next/link";
import { ExternalLink, Medal, Shield } from "lucide-react";
import { AdminCard } from "@/components/admin-ui";
import { AdminSettingsTab } from "@/components/admin-settings-tab";

type Props = {
  loading: boolean;
  onReload: () => void;
};

export function AdminPzuCupTab({ loading, onReload }: Props) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border-2 border-amber-400/50 bg-gradient-to-br from-amber-950/50 to-amber-900/20 px-4 py-4 text-amber-50 shadow-md">
        <div className="flex flex-wrap items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 ring-1 ring-amber-400/40">
            <Shield className="h-5 w-5 text-amber-200" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-200/80">Osobny realm</p>
            <h2 className="text-lg font-bold text-white">PZU Cup — nie Akademia</h2>
            <p className="mt-1 text-sm text-amber-100/85">
              Gracze, mecze i ustawienia poniżej należą wyłącznie do turnieju. Zmiany nie przenoszą się
              na stronę akademii (zakładka Ustawienia w „Treść i witryna”).
            </p>
          </div>
        </div>
      </div>

      <AdminCard
        title="Strona turnieju"
        description="Publiczny widok PZU Cup — rejestracja i terminarze turniejowe."
      >
        <Link
          href="/pzu-cup"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/15 px-4 py-2.5 text-sm font-semibold text-amber-100 hover:bg-amber-500/25"
        >
          <Medal className="h-4 w-4" aria-hidden />
          Otwórz stronę PZU Cup
          <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden />
        </Link>
        <p className="mt-3 text-sm pitch-muted">
          Mecze z nagłówkiem realm PZU Cup lub z /pzu-cup/terminarz trafiają tylko do turnieju.
          Rejestracja: /pzu-cup/register.
        </p>
      </AdminCard>

      <AdminSettingsTab loading={loading} onReload={onReload} settingsRealm="pzu_cup" />
    </div>
  );
}
