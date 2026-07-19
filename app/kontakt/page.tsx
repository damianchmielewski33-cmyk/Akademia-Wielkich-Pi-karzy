import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PitchCard, PitchPageHero, pitchLabelClass } from "@/components/ui/pitch-card";
import { getAppSettings } from "@/lib/app-settings";
import { getDb } from "@/lib/db";

export async function generateMetadata(): Promise<Metadata> {
  const db = await getDb();
  const settings = await getAppSettings(db);
  return {
    title: "Kontakt",
    description: `Dane kontaktowe organizatorów — ${settings.site_name}.`,
  };
}

export default async function KontaktPage() {
  const db = await getDb();
  const settings = await getAppSettings(db);

  return (
    <div className="awp-page awp-page--default text-center">
      <PitchPageHero title="Kontakt" subtitle="Dane kontaktowe organizatorów" />

      <div className="mx-auto mt-8 max-w-3xl">
        <PitchCard className="text-left" contentClassName="p-6 sm:p-8">
          <span className={pitchLabelClass}>Organizatorzy</span>
          <h2 className="pitch-heading mt-2 text-xl sm:text-2xl">Zespół akademii</h2>
          <div className="pitch-rule mt-3 w-28 max-w-full opacity-90" />

          <div className="mt-6 grid gap-3">
            <OrganizerCard
              name={settings.organizer_damian_name}
              phone={settings.organizer_damian_phone}
              email={settings.organizer_damian_email}
              facebookUrl={settings.facebook_damian_url}
            />
            <OrganizerCard
              name={settings.organizer_mateusz_name}
              phone={settings.organizer_mateusz_phone}
              email={settings.organizer_mateusz_email}
              facebookUrl={settings.facebook_mateusz_url}
            />
          </div>
        </PitchCard>
      </div>

      <p className="mt-10">
        <Link href="/" className="pitch-link text-sm">
          ← Strona główna
        </Link>
      </p>
    </div>
  );
}

function OrganizerCard({
  name,
  phone,
  email,
  facebookUrl,
}: {
  name: string;
  phone?: string;
  email?: string;
  facebookUrl?: string | null;
}) {
  return (
    <PitchCard showDecorations className="shadow-md shadow-emerald-950/10">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 text-white">
          <p className="text-lg font-bold tracking-tight drop-shadow-sm">{name}</p>
          <div className="mt-2 grid gap-1 text-sm text-emerald-50/95">
            {phone ? (
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4" aria-hidden />
                <span className="font-semibold">{phone}</span>
              </p>
            ) : null}
            {email ? (
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4" aria-hidden />
                <span className="font-medium">{email}</span>
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-2 sm:items-end">
          <div className="flex flex-wrap gap-2">
            {phone ? (
              <Button
                asChild
                variant="secondary"
                className="bg-white/95 text-emerald-950 hover:bg-white dark:bg-zinc-800 dark:text-emerald-100 dark:hover:bg-zinc-700"
              >
                <a href={`tel:${phone.replace(/\s/g, "")}`}>Zadzwoń</a>
              </Button>
            ) : null}
            {email ? (
              <Button
                asChild
                variant="secondary"
                className="bg-white/95 text-emerald-950 hover:bg-white dark:bg-zinc-800 dark:text-emerald-100 dark:hover:bg-zinc-700"
              >
                <a href={`mailto:${email}`}>Napisz email</a>
              </Button>
            ) : null}
            {facebookUrl ? (
              <Button
                asChild
                variant="secondary"
                className="bg-white/95 text-emerald-950 hover:bg-white dark:bg-zinc-800 dark:text-emerald-100 dark:hover:bg-zinc-700"
              >
                <a href={facebookUrl} target="_blank" rel="noreferrer">
                  Facebook
                </a>
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                disabled
                className="bg-white/90 text-emerald-950 dark:bg-zinc-800/80 dark:text-zinc-500"
              >
                Facebook
              </Button>
            )}
          </div>
        </div>
      </div>
    </PitchCard>
  );
}
