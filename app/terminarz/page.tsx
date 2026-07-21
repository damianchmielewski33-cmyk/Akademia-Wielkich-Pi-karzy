import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { REALMS } from "@/lib/realm";
import { getTerminarzPageData } from "@/lib/realm-page-data";
import { TerminarzClient } from "@/components/terminarz-client";

export const metadata: Metadata = {
  title: "Terminarz",
  description: "Zapisy na mecze, lista terminów i archiwum.",
};

export default async function TerminarzPage({
  searchParams,
}: {
  searchParams: Promise<{
    mecz?: string;
    zaproszenie?: string;
    statystyki?: string;
    statystyki_ankiety?: string;
    obecnosc?: string;
  }>;
}) {
  const sp = await searchParams;
  const raw = sp.mecz;
  let highlightMatchId: number | null = null;
  if (raw) {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n > 0) highlightMatchId = n;
  }
  const inviteFromShare = sp.zaproszenie === "1";
  if (inviteFromShare && highlightMatchId != null) {
    redirect(`/zaproszenie/${highlightMatchId}`);
  }

  const statystyki = sp.statystyki;
  const openStatsFromUrl =
    Boolean(highlightMatchId) && (statystyki === "1" || statystyki === "true");
  const openStandaloneSurveyStats =
    sp.statystyki_ankiety === "1" || sp.statystyki_ankiety === "true";
  const openAttendanceFromUrl =
    Boolean(highlightMatchId) && (sp.obecnosc === "1" || sp.obecnosc === "true");

  const session = await getServerSession();
  const data = await getTerminarzPageData(REALMS.ACADEMY, session);

  return (
    <div className="container mx-auto max-w-7xl flex-1 px-4 py-8 sm:py-10">
      <TerminarzClient
        upcoming={data.upcoming}
        playedConfirmed={data.playedConfirmed}
        allMatches={data.matches}
        playersData={data.playersData}
        userSignupKind={data.userSignupKind}
        playedMissingStatsMatchIds={data.playedMissingStatsMatchIds}
        isLoggedIn={Boolean(session)}
        isAdmin={session?.isAdmin ?? false}
        highlightMatchId={highlightMatchId}
        openStatsFromUrl={openStatsFromUrl}
        openStandaloneSurveyStats={openStandaloneSurveyStats}
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
