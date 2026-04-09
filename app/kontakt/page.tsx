import type { Metadata } from "next";
import Link from "next/link";
import { MATCH_BLIK_PHONE_DISPLAY, SITE_NAME, getPublicContactEmail } from "@/lib/site";

const DEFAULT_CONTACT_EMAIL = "damianchmielewski33@gmail.com";

export const metadata: Metadata = {
  title: "Kontakt",
  description: `Dane kontaktowe organizatorów — ${SITE_NAME}.`,
};

export default function KontaktPage() {
  const email = getPublicContactEmail() ?? DEFAULT_CONTACT_EMAIL;

  return (
    <div className="container mx-auto max-w-2xl flex-1 px-4 py-8 sm:py-10">
      <h1 className="text-3xl font-bold tracking-tight text-emerald-950">Kontakt</h1>
      <p className="mt-2 text-sm text-zinc-600">Dane kontaktowe organizatorów.</p>

      <div className="mt-8 grid gap-4">
        <section className="rounded-2xl border border-emerald-100/80 bg-white/90 p-5 shadow-sm backdrop-blur">
          <h2 className="text-base font-semibold text-emerald-950">Damian Chmielewski</h2>
          <dl className="mt-3 grid gap-2 text-sm text-zinc-700">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <dt className="font-medium text-zinc-900">Telefon</dt>
              <dd className="font-semibold text-zinc-900">{MATCH_BLIK_PHONE_DISPLAY}</dd>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <dt className="font-medium text-zinc-900">Email</dt>
              <dd>
                <a className="font-semibold text-emerald-800 underline underline-offset-2" href={`mailto:${email}`}>
                  {email}
                </a>
              </dd>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <dt className="font-medium text-zinc-900">Facebook</dt>
              <dd className="text-zinc-700">Kontakt przez Facebook</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-emerald-100/80 bg-white/90 p-5 shadow-sm backdrop-blur">
          <h2 className="text-base font-semibold text-emerald-950">Mateusz Wierzbicki</h2>
          <dl className="mt-3 grid gap-2 text-sm text-zinc-700">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <dt className="font-medium text-zinc-900">Facebook</dt>
              <dd className="text-zinc-700">Kontakt przez Facebook</dd>
            </div>
          </dl>
        </section>
      </div>

      <p className="mt-10">
        <Link href="/" className="text-sm font-semibold text-emerald-800 hover:underline">
          ← Strona główna
        </Link>
      </p>
    </div>
  );
}

