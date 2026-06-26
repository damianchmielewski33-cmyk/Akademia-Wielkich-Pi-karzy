import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/register-form";
import { PitchCard, pitchLabelClass } from "@/components/ui/pitch-card";

export const metadata: Metadata = {
  title: "Rejestracja",
  description: "Załóż konto i dołącz do akademii.",
};

type PageProps = { searchParams: Promise<{ next?: string }> };

export default async function RegisterPage({ searchParams }: PageProps) {
  const { next: nextRaw } = await searchParams;
  const nextPath = nextRaw && nextRaw.startsWith("/") ? nextRaw : undefined;

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4 py-12">
      <PitchCard as="div" className="w-full max-w-md" contentClassName="p-8">
        <span className={`${pitchLabelClass} block text-center`}>Dołącz do drużyny</span>
        <h1 className="mt-2 text-center text-2xl font-bold tracking-tight text-white">Rejestracja</h1>
        <p className="mt-2 text-center text-sm text-emerald-100/90">
          Kolejność jak przy logowaniu: imię i nazwisko, potem pseudonim piłkarza (awatar — możesz wyszukać w internecie lub wpisać własny), na końcu PIN (4–6 cyfr) — tym PIN-em będziesz się logować.
        </p>
        <RegisterForm nextPath={nextPath} />
        <div className="mt-6 space-y-2 text-center text-sm">
          <Link
            href={nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login"}
            className="pitch-link block"
          >
            Masz już konto? Zaloguj się
          </Link>
          <Link href="/" className="pitch-link block text-emerald-100/80">
            Powrót na stronę główną
          </Link>
        </div>
      </PitchCard>
    </div>
  );
}
