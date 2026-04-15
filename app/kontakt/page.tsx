import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MATCH_BLIK_PHONE_DISPLAY, SITE_NAME, getPublicContactEmailWithFallback } from "@/lib/site";

export const metadata: Metadata = {
  title: "Kontakt",
  description: `Dane kontaktowe organizatorów — ${SITE_NAME}.`,
};

export default function KontaktPage() {
  const email = getPublicContactEmailWithFallback();
  const fbDamian = process.env.NEXT_PUBLIC_FACEBOOK_DAMIAN?.trim() || null;
  const fbMateusz = process.env.NEXT_PUBLIC_FACEBOOK_MATEUSZ?.trim() || null;

  return (
    <div className="container mx-auto max-w-5xl flex-1 px-4 py-8 text-center sm:py-10">
      <div className="relative mx-auto max-w-2xl">
        <div className="pitch-rule mx-auto mb-5 w-40 sm:w-48" />
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5">
          <Image
            src="/soccer-ball.svg"
            alt=""
            width={56}
            height={56}
            className="h-12 w-12 drop-shadow-sm sm:h-14 sm:w-14"
            unoptimized
          />
          <h1 className="text-3xl font-bold tracking-tight text-emerald-950 dark:text-emerald-100 sm:text-4xl">Kontakt</h1>
          <Image
            src="/soccer-ball.svg"
            alt=""
            width={56}
            height={56}
            className="h-12 w-12 scale-x-[-1] drop-shadow-sm sm:h-14 sm:w-14"
            unoptimized
          />
        </div>
        <p className="mt-4 text-base text-zinc-600 dark:text-zinc-400 sm:text-lg">Dane kontaktowe organizatorów</p>
      </div>

      <div className="mx-auto mt-8 max-w-3xl">
        <section className="relative overflow-hidden rounded-2xl border-2 border-white/40 bg-white/90 p-6 text-left shadow-lg shadow-emerald-950/10 ring-1 ring-emerald-950/10 dark:border-emerald-900/35 dark:bg-zinc-900/92 dark:shadow-black/40 dark:ring-emerald-900/35 sm:p-8">
          <div className="home-pitch-tile pointer-events-none absolute inset-0 opacity-[0.07]" aria-hidden />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-white/50" aria-hidden />
          <div className="relative">
            <h2 className="text-xl font-bold tracking-tight text-emerald-950 dark:text-emerald-100 sm:text-2xl">Organizatorzy</h2>
            <div className="pitch-rule mt-3 w-28 max-w-full opacity-90" />

            <div className="mt-6 grid gap-3">
              <OrganizerCard
                name="Damian Chmielewski"
                phone={MATCH_BLIK_PHONE_DISPLAY}
                email={email}
                facebookUrl={fbDamian}
              />
              <OrganizerCard name="Mateusz Wierzbicki" facebookUrl={fbMateusz} />
            </div>
          </div>
        </section>
      </div>

      <p className="mt-10">
        <Link href="/" className="text-sm font-semibold text-emerald-800 hover:underline dark:text-emerald-300">
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
    <div className="relative overflow-hidden rounded-2xl border-2 border-white/35 shadow-md shadow-emerald-950/10 ring-1 ring-emerald-950/10">
      <div className="home-pitch-tile absolute inset-0 opacity-[0.22]" aria-hidden />
      <div className="pointer-events-none absolute bottom-0 left-0 h-9 w-9 rounded-tr-full border-t-2 border-r-2 border-white/40" aria-hidden />
      <div className="pointer-events-none absolute bottom-0 right-0 h-9 w-9 rounded-tl-full border-t-2 border-l-2 border-white/40" aria-hidden />

      <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
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
            <p className="flex items-center gap-2 text-emerald-50/90">
              <MessageCircle className="h-4 w-4" aria-hidden />
              <span>{facebookUrl ? "Facebook" : "Kontakt przez Facebook"}</span>
            </p>
          </div>
        </div>

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
  );
}

