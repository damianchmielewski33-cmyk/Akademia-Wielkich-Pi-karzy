import type { Metadata } from "next";
import Link from "next/link";
import { CookieConsentManager } from "@/components/cookie-consent-manager";
import { PitchCard, PitchPageHero, pitchLabelClass } from "@/components/ui/pitch-card";
import { getAppSettings } from "@/lib/app-settings";
import { getDb } from "@/lib/db";

export async function generateMetadata(): Promise<Metadata> {
  const db = await getDb();
  const settings = await getAppSettings(db);
  return {
    title: "Polityka cookies",
    description: `Jak używamy plików cookies w serwisie ${settings.site_name}.`,
  };
}

export default async function CookiesPage() {
  const db = await getDb();
  const settings = await getAppSettings(db);
  const email = settings.contact_email;
  const siteName = settings.site_name;

  return (
    <div className="awp-page awp-page--narrow">
      <PitchPageHero
        title="Polityka cookies"
        subtitle={
          <>
            Jakie pliki cookies używa{" "}
            <strong className="font-semibold text-white">{siteName}</strong> i jak nimi zarządzać.
          </>
        }
      />

      <PitchCard className="mt-8 text-left" contentClassName="p-6 sm:p-8">
        <span className={pitchLabelClass}>Cookies</span>
        <div className="mt-4 space-y-5 text-sm leading-relaxed text-emerald-100/90">
          <p className="text-xs text-emerald-100/70">Ostatnia aktualizacja: 7 sierpnia 2026</p>

          <section>
            <h2 className="pitch-heading text-lg">1. Czym są cookies</h2>
            <p className="mt-2">
              Cookies to niewielkie pliki zapisywane w przeglądarce. Pomagają utrzymać sesję
              logowania, zapamiętać wybory (np. motyw) oraz — za zgodą — wyświetlać reklamy i zbierać
              statystyki.
            </p>
          </section>

          <section>
            <h2 className="pitch-heading text-lg">2. Rodzaje cookies na stronie</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>
                <strong className="text-white">Niezbędne</strong> — sesja, bezpieczeństwo, podstawowe
                działanie serwisu oraz lokalne statystyki odwiedzin (tylko panel administratora,
                bez reklamodawców). Działają zawsze.
              </li>
              <li>
                <strong className="text-white">Marketingowe / reklamowe</strong> — Google AdSense
                (wyświetlenia i kliknięcia reklam). Włączane wyłącznie po zgodzie „Akceptuję”.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="pitch-heading text-lg">3. Google AdSense</h2>
            <p className="mt-2">
              Skrypt Google AdSense ładujemy dopiero po wyrażeniu zgody na cookies marketingowe.
              Google może używać cookies do personalizacji reklam lub pomiaru skuteczności.
              Szczegóły:{" "}
              <a
                className="pitch-link"
                href="https://policies.google.com/technologies/ads"
                rel="noopener noreferrer"
                target="_blank"
              >
                policies.google.com/technologies/ads
              </a>
              .
            </p>
            <p className="mt-2">
              Reklam nie pokazujemy na stronach logowania, płatności, profilu ani w panelu
              administratora.
            </p>
          </section>

          <section>
            <h2 className="pitch-heading text-lg">4. Jak zarządzać zgodą</h2>
            <p className="mt-2">
              Przy pierwszej wizycie pojawia się baner. Możesz wybrać „Akceptuję” albo „Tylko
              niezbędne”. Decyzję zmienisz w każdej chwili poniżej (albo w stopce strony):
            </p>
            <CookieConsentManager />
          </section>

          <section>
            <h2 className="pitch-heading text-lg">5. Więcej informacji</h2>
            <p className="mt-2">
              Pełny opis przetwarzania danych:{" "}
              <Link className="pitch-link" href="/polityka-prywatnosci">
                polityka prywatności
              </Link>
              . Kontakt:{" "}
              <a className="pitch-link" href={`mailto:${email}`}>
                {email}
              </a>
              .
            </p>
          </section>
        </div>
      </PitchCard>

      <p className="mt-10 text-center">
        <Link href="/" className="pitch-link text-sm">
          ← Strona główna
        </Link>
      </p>
    </div>
  );
}
