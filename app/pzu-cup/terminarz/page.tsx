import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { canAccessPzuCup } from "@/lib/pzu-cup-access";
import { REALMS } from "@/lib/realm";
import { getTerminarzPageData } from "@/lib/realm-page-data";
import { TerminarzClient } from "@/components/terminarz-client";

export const metadata: Metadata = {
  title: "Terminarz",
  description: "Terminarz meczów PZU Cup.",
};

type PageProps = {
  searchParams: Promise<{
    mecz?: string;
    statystyki?: string;
    obecnosc?: string;
  }>;
};

export default async function PzuCupTerminarzPage({ searchParams }: PageProps) {
  const session = await getServerSession();
  if (!session) redirect("/pzu-cup/login?next=/pzu-cup/terminarz");
  if (!(await canAccessPzuCup(session))) redirect("/");

  const sp = await searchParams;
  const raw = sp.mecz;
  let highlightMatchId: number | null = null;
  if (raw) {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n > 0) highlightMatchId = n;
  }

  const openStatsFromUrl =
    Boolean(highlightMatchId) && (sp.statystyki === "1" || sp.statystyki === "true");
  const openAttendanceFromUrl =
    Boolean(highlightMatchId) && (sp.obecnosc === "1" || sp.obecnosc === "true");

  const data = await getTerminarzPageData(REALMS.PZU_CUP, session);

  return (
    <div className="container mx-auto max-w-7xl flex-1 px-4 py-8 sm:py-10">
      <TerminarzClient
        upcoming={data.upcoming}
        playedConfirmed={data.playedConfirmed}
        allMatches={data.matches}
        playersData={data.playersData}
        userSignupKind={data.userSignupKind}
        playedMissingStatsMatchIds={data.playedMissingStatsMatchIds}
        isLoggedIn
        isAdmin={session.isAdmin}
        highlightMatchId={highlightMatchId}
        openStatsFromUrl={openStatsFromUrl}
        openAttendanceFromUrl={openAttendanceFromUrl}
        matchDefaults={{
          maxSlots: data.appSettings.default_match_max_slots,
          location: data.appSettings.default_match_location,
          feePln: data.appSettings.default_match_fee_pln,
        }}
        cancelReasons={data.appSettings.match_cancel_reasons}
      />
    </div>
  );
}
