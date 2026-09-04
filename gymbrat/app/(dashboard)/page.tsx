import { auth } from "@/auth";
import { OnboardingBanner } from "@/components/home/onboarding-banner";
import {
  HomeBodyMainChart,
  HomeBodyMiniSparks,
} from "@/components/home/home-body-charts-dynamic";
import {
  HomeTransformationCarousel,
  HomeWeightSummaryCards,
} from "@/components/home/home-body-summary";
import { getDb } from "@/db";
import { userSettings } from "@/db/schema";
import { getHomeBodyDashboard } from "@/lib/home-body-dashboard";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Dumbbell, FilePlus2, Scale } from "lucide-react";

export default async function HomePage() {
  const session = await auth().catch((err) => {
    console.error("[home] auth()", err);
    return null;
  });
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/login?callbackUrl=/");
  }

  const db = getDb();
  const [[settingsRow], body] = await Promise.all([
    db
      .select({ onboardingCompletedAt: userSettings.onboardingCompletedAt })
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1),
    getHomeBodyDashboard(userId),
  ]);

  return (
    <div className="space-y-8">
      <section className="space-y-1">
        <p className="pitch-label">Start</p>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-[var(--mundial-navy)] sm:text-4xl dark:text-white">
          Cześć, {body.displayName}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Twoja waga, wymiary i przemiana — w jednym miejscu.
        </p>
      </section>

      {!settingsRow?.onboardingCompletedAt ? <OnboardingBanner /> : null}

      <div className="flex flex-wrap gap-2">
        <Link
          href="/start-workout"
          className="awp-focus-ring inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--mp-teal)] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[var(--mp-teal-dark)]"
        >
          <Dumbbell className="h-4 w-4" aria-hidden />
          Trening
        </Link>
        <Link
          href="/reports"
          className="awp-focus-ring inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800 shadow-sm hover:border-teal-200 hover:bg-teal-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
        >
          <FilePlus2 className="h-4 w-4" aria-hidden />
          Raport ciała
        </Link>
        <Link
          href="/progress-analysis"
          className="awp-focus-ring inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800 shadow-sm hover:border-teal-200 hover:bg-teal-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
        >
          <Scale className="h-4 w-4" aria-hidden />
          Analiza
        </Link>
      </div>

      <HomeWeightSummaryCards data={body} />

      <HomeBodyMainChart data={body} />

      <section className="space-y-3">
        <div>
          <p className="pitch-label">Przemiana</p>
          <h2 className="mt-1 font-heading text-lg font-semibold text-zinc-950 dark:text-white">
            Twoja przemiana
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Przesuwaj w poziomie — pierwsze zdjęcia w aplikacji i aktualne.
          </p>
        </div>
        <HomeTransformationCarousel photos={body.transformationPhotos} />
      </section>

      <HomeBodyMiniSparks data={body} />
    </div>
  );
}
