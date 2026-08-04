import type { Metadata } from "next";
import Link from "next/link";
import { PitchCard, PitchPageHero, pitchLabelClass } from "@/components/ui/pitch-card";
import { getAppSettings } from "@/lib/app-settings";
import { getDb } from "@/lib/db";
import { getSiteUrl } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const db = await getDb();
  const settings = await getAppSettings(db);
  return {
    title: "Polityka prywatności",
    description: `Jak przetwarzamy dane osobowe w serwisie ${settings.site_name}.`,
  };
}

export default async function PolitykaPrywatnosciPage() {
  const db = await getDb();
  const settings = await getAppSettings(db);
  const email = settings.contact_email;
  const siteName = settings.site_name;
  const siteUrl = getSiteUrl();

  return (
    <div className="awp-page awp-page--narrow">
      <PitchPageHero
        title="Polityka prywatności"
        subtitle={
          <>
            Informacje o przetwarzaniu danych w serwisie{" "}
            <strong className="font-semibold text-white">{siteName}</strong>.
          </>
        }
      />

      <PitchCard className="mt-8 text-left" contentClassName="p-6 sm:p-8">
        <span className={pitchLabelClass}>RODO</span>
        <div className="mt-4 space-y-5 text-sm leading-relaxed text-emerald-100/90">
          <p className="text-xs text-emerald-100/70">Ostatnia aktualizacja: 3 sierpnia 2026</p>

          <section>
            <h2 className="pitch-heading text-lg">1. Administrator danych</h2>
            <p className="mt-2">
              Administratorem danych osobowych użytkowników serwisu {siteName} ({siteUrl}) jest
              organizator akademii. Kontakt w sprawach prywatności:{" "}
              <a className="pitch-link" href={`mailto:${email}`}>
                {email}
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="pitch-heading text-lg">2. Jakie dane zbieramy</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>dane konta: imię, nazwisko, nick zawodnika, hasło (zahaszowane), opcjonalnie e-mail;</li>
              <li>dane związane z meczami: zapisy, składy, statystyki, płatności / portfel;</li>
              <li>
                dane techniczne: adres IP, typ urządzenia, logi bezpieczeństwa, identyfikator sesji;
              </li>
              <li>
                lokalne statystyki odwiedzin (ekran / ścieżka, anonimowy identyfikator odwiedzającego) —
                wyłącznie na potrzeby organizacji akademii;
              </li>
              <li>
                za zgodą: cookies reklamowe (Google AdSense).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="pitch-heading text-lg">3. Cele i podstawy prawne</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>świadczenie usług serwisu (zapisy, składy, rankingi, komunikacja) — wykonanie umowy / prawnie uzasadniony interes;</li>
              <li>bezpieczeństwo konta i zapobieganie nadużyciom — prawnie uzasadniony interes;</li>
              <li>lokalne statystyki odwiedzin (w tym zaproszenia i linki płatności) — prawnie uzasadniony interes (art. 6 ust. 1 lit. f RODO);</li>
              <li>obowiązki księgowe związane z płatnościami — obowiązek prawny (jeśli dotyczy);</li>
              <li>reklamy i pomiar skuteczności (AdSense) — zgoda (art. 6 ust. 1 lit. a RODO).</li>
            </ul>
          </section>

          <section>
            <h2 className="pitch-heading text-lg">4. Odbiorcy danych</h2>
            <p className="mt-2">
              Dane mogą być przekazywane dostawcom hostingu, bazy danych, poczty e-mail, płatności
              (np. HotPay) oraz — po wyrażeniu zgody na cookies marketingowe — Google Ireland Ltd /
              Google LLC w ramach Google AdSense. Przekazanie poza EOG odbywa się na podstawie
              standardowych klauzul umownych Google lub innych mechanizmów zgodnych z RODO.
            </p>
          </section>

          <section>
            <h2 className="pitch-heading text-lg">5. Okres przechowywania</h2>
            <p className="mt-2">
              Dane konta przechowujemy przez czas korzystania z serwisu oraz przez okres niezbędny do
              rozliczeń i obrony roszczeń. Logi techniczne — zwykle do kilku miesięcy. Zgody cookies —
              do ich wycofania lub zmiany w przeglądarce (wyczyszczenie danych lokalnych).
            </p>
          </section>

          <section>
            <h2 className="pitch-heading text-lg">6. Twoje prawa</h2>
            <p className="mt-2">
              Masz prawo dostępu do danych, sprostowania, usunięcia, ograniczenia przetwarzania,
              przenoszenia oraz wniesienia sprzeciwu. Zgodę na cookies możesz wycofać w każdej chwili
              (wyczyść dane strony w przeglądarce lub wybierz „Tylko niezbędne” po ponownym wyświetleniu
              banera). Masz też prawo skargi do Prezesa UODO.
            </p>
          </section>

          <section>
            <h2 className="pitch-heading text-lg">7. Cookies i reklamy</h2>
            <p className="mt-2">
              Szczegóły dotyczące plików cookies, reklam Google AdSense oraz sposobu zarządzania zgodą
              znajdziesz w{" "}
              <Link className="pitch-link" href="/cookies">
                polityce cookies
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="pitch-heading text-lg">8. Kontakt</h2>
            <p className="mt-2">
              Pytania:{" "}
              <a className="pitch-link" href={`mailto:${email}`}>
                {email}
              </a>
              . Zasady korzystania z serwisu i płatności:{" "}
              <Link className="pitch-link" href="/regulamin">
                regulamin
              </Link>
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
