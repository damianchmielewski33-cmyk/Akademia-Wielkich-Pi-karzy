import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { REALMS } from "@/lib/realm";
import { getTerminarzPageData } from "@/lib/realm-page-data";
import { getDb } from "@/lib/db";
import { getAppSettings } from "@/lib/app-settings";
import { isHotpayConfigured } from "@/lib/hotpay";
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
    losowanie?: string;
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

  if (highlightMatchId != null && (sp.losowanie === "1" || sp.losowanie === "true")) {
    redirect(`/losowanie-kapitana/${highlightMatchId}`);
  }

  const session = await getServerSession();
  const [data, db] = await Promise.all([
    getTerminarzPageData(REALMS.ACADEMY, session),
    getDb(),
  ]);
  const appSettings = await getAppSettings(db);

  return (
    <div className="container mx-auto max-w-7xl flex-1 px-4 py-8 sm:py-10">
      <Suspense fallback={<p className="text-center text-sm text-zinc-500">Ładowanie terminarza…</p>}>
        <TerminarzClient
          upcoming={data.upcoming}
          playedConfirmed={data.playedConfirmed}
          allMatches={data.matches}
          playersData={data.playersData}
          userSignupKind={data.userSignupKind}
          playedMissingStatsMatchIds={data.playedMissingStatsMatchIds}
          isLoggedIn={Boolean(session)}
          isAdmin={session?.isAdmin ?? false}
          currentUserId={session?.userId ?? null}
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
          captainLotteryData={data.captainLotteryData}
          captainLotteryHistory={data.captainLotteryHistory}
          hotpayEnabled={isHotpayConfigured() && appSettings.hotpay_enabled}
        />
      </Suspense>
    </div>
  );
}
