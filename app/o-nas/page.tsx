import type { Metadata } from "next";
import Link from "next/link";
import { PitchCard, PitchPageHero, pitchLabelClass } from "@/components/ui/pitch-card";
import { getAppSettings } from "@/lib/app-settings";
import { getDb } from "@/lib/db";

export async function generateMetadata(): Promise<Metadata> {
  const db = await getDb();
  const settings = await getAppSettings(db);
  return {
    title: "O nas",
    description: `Zasady zapisów, statystyki i kontakt — ${settings.site_name}.`,
  };
}

export default async function ONasPage() {
  const db = await getDb();
  const settings = await getAppSettings(db);
  const email = settings.contact_email;
  const siteName = settings.site_name;

  return (
    <div className="awp-page awp-page--narrow">
      <PitchPageHero
        title="O akademii"
        subtitle={
          <>
            Krótki przewodnik po tym, jak działa strona{" "}
            <strong className="font-semibold text-white">{siteName}</strong>.
          </>
        }
      />

      <PitchCard className="mt-8 text-left" contentClassName="p-6 sm:p-8">
        <span className={pitchLabelClass}>Zasady</span>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-emerald-100/90">
          <div>
            <h2 className="pitch-heading text-lg">Zapisy na mecz</h2>
            <p className="mt-2">
              Terminy znajdziesz w zakładce{" "}
              <Link className="pitch-link" href="/terminarz">
                Terminarz
              </Link>
              . Zapis jest możliwy po założeniu konta i zalogowaniu. Liczba miejsc na dany dzień jest ograniczona — gdy skład jest pełny, zapis w aplikacji nie jest dostępny.
            </p>
            <p className="mt-2">
              Przed rozpoczęciem meczu możesz się wypisać z terminu w terminarzu (zwolnisz miejsce dla innego zawodnika). Po upływie terminu wypisu z poziomu aplikacji zwykle nie ma — wtedy sprawy organizacyjne uzgadnia się z administratorem.
            </p>
          </div>

          <div>
            <h2 className="pitch-heading text-lg">Składy</h2>
            <p className="mt-2">
              Ustawienia drużyn na boisku publikuje administrator. Po udostępnieniu zobaczysz je w{" "}
              <Link className="pitch-link" href="/sklady">
                Składach
              </Link>
              — dostępne są też wcześniejsze mecze, jeśli składy były publiczne.
            </p>
          </div>

          <div>
            <h2 className="pitch-heading text-lg">Statystyki i rankingi</h2>
            <p className="mt-2">
              Po rozegranych meczach możesz uzupełnić swoje liczby (gole, asysty, dystans, obrony). Zbierają się one w{" "}
              <Link className="pitch-link" href="/statystyki">
                Statystykach
              </Link>{" "}
              i{" "}
              <Link className="pitch-link" href="/rankingi">
                Rankingach
              </Link>{" "}
              (wymagane konto).
            </p>
          </div>

          <div>
            <h2 className="pitch-heading text-lg">Kontakt i dane</h2>
            <p className="mt-2">
              Pytania organizacyjne:{" "}
              <a className="pitch-link" href={`mailto:${email}`}>
                {email}
              </a>
              .
            </p>
            <p className="mt-2 text-xs text-emerald-100/75">
              Konto w serwisie służy do zapisów i statystyk w ramach działalności akademii. Nie udostępniaj hasła innym osobom.
            </p>
          </div>
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
