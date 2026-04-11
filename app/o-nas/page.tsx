import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME, getPublicContactEmail } from "@/lib/site";

const DEFAULT_ONAS_CONTACT_EMAIL = "damianchmielewski33@gmail.com";

export const metadata: Metadata = {
  title: "O nas",
  description: "Zasady zapisów, statystyki i kontakt — Akademia Wielkich Piłkarzy.",
};

export default function ONasPage() {
  const email = getPublicContactEmail() ?? DEFAULT_ONAS_CONTACT_EMAIL;

  return (
    <div className="container mx-auto max-w-2xl flex-1 px-4 py-8 sm:py-10">
      <h1 className="text-3xl font-bold tracking-tight text-emerald-950 dark:text-emerald-100">O akademii</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Krótki przewodnik po tym, jak działa strona{" "}
        <strong className="font-semibold text-zinc-800 dark:text-zinc-200">{SITE_NAME}</strong>.
      </p>

      <section className="mt-8 space-y-4 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        <h2 className="text-lg font-semibold text-emerald-950 dark:text-emerald-100">Zapisy na mecz</h2>
        <p>
          Terminy znajdziesz w zakładce{" "}
          <Link className="font-medium text-emerald-800 underline dark:text-emerald-400" href="/terminarz">
            Terminarz
          </Link>
          .
          Zapis jest możliwy po założeniu konta i zalogowaniu. Liczba miejsc na dany dzień jest ograniczona — gdy skład jest pełny,
          zapis w aplikacji nie jest dostępny.
        </p>
        <p>
          Przed rozpoczęciem meczu możesz się wypisać z terminu w terminarzu (zwolnisz miejsce dla innego zawodnika). Po upływie terminu
          wypisu z poziomu aplikacji zwykle nie ma — wtedy sprawy organizacyjne uzgadnia się z administratorem.
        </p>

        <h2 className="pt-4 text-lg font-semibold text-emerald-950 dark:text-emerald-100">Składy</h2>
        <p>
          Ustawienia drużyn na boisku publikuje administrator. Po udostępnieniu zobaczysz je w{" "}
          <Link className="font-medium text-emerald-800 underline dark:text-emerald-400" href="/sklady">
            Składach
          </Link>
          — dostępne są też wcześniejsze mecze, jeśli składy były publiczne.
        </p>

        <h2 className="pt-4 text-lg font-semibold text-emerald-950 dark:text-emerald-100">Statystyki i rankingi</h2>
        <p>
          Po rozegranych meczach możesz uzupełnić swoje liczby (gole, asysty, dystans, obrony). Zbierają się one w{" "}
          <Link className="font-medium text-emerald-800 underline dark:text-emerald-400" href="/statystyki">
            Statystykach
          </Link>{" "}
          i{" "}
          <Link className="font-medium text-emerald-800 underline dark:text-emerald-400" href="/rankingi">
            Rankingach
          </Link>{" "}
          (wymagane konto).
        </p>

        <h2 className="pt-4 text-lg font-semibold text-emerald-950 dark:text-emerald-100">Kontakt i dane</h2>
        <p>
          Pytania organizacyjne:{" "}
          <a className="font-medium text-emerald-800 underline dark:text-emerald-400" href={`mailto:${email}`}>
            {email}
          </a>
          .
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Konto w serwisie służy do zapisów i statystyk w ramach działalności akademii. Nie udostępniaj hasła innym osobom.
        </p>
      </section>

      <p className="mt-10">
        <Link href="/" className="text-sm font-semibold text-emerald-800 hover:underline dark:text-emerald-300">
          ← Strona główna
        </Link>
      </p>
    </div>
  );
}
