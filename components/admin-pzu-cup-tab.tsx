"use client";

import Link from "next/link";
import { ExternalLink, Medal } from "lucide-react";
import { AdminCard } from "@/components/admin-ui";
import { AdminSettingsTab } from "@/components/admin-settings-tab";

type Props = {
  loading: boolean;
  onReload: () => void;
};

export function AdminPzuCupTab({ loading, onReload }: Props) {
  return (
    <div className="space-y-6">
      <AdminCard
        title="PZU Cup"
        description="Osobna sekcja turnieju — inna baza graczy, meczów i ustawień niż Akademia."
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
          Mecze dodane w panelu (Terminarz) z nagłówkiem realm PZU Cup lub z poziomu /pzu-cup/terminarz trafiają
          tylko do turnieju. Użytkownicy PZU Cup rejestrują się na /pzu-cup/register.
        </p>
      </AdminCard>

      <AdminSettingsTab loading={loading} onReload={onReload} settingsRealm="pzu_cup" />
    </div>
  );
}
