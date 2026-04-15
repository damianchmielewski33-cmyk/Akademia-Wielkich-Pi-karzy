import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/register-form";

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
      <div className="w-full max-w-md rounded-2xl border border-zinc-200/80 bg-white p-8 shadow-sm dark:border-zinc-700/80 dark:bg-zinc-900/90 dark:shadow-black/30">
        <h1 className="text-center text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Rejestracja</h1>
        <p className="mt-2 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Kolejność jak przy logowaniu: imię i nazwisko, potem pseudonim piłkarza (awatar — możesz wyszukać w internecie lub wpisać własny), na końcu PIN (4–6 cyfr) — tym PIN-em będziesz się logować.
        </p>
        <RegisterForm nextPath={nextPath} />
        <div className="mt-6 space-y-2 text-center text-sm">
          <Link
            href={nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login"}
            className="block font-medium text-emerald-700 hover:underline dark:text-emerald-400"
          >
            Masz już konto? Zaloguj się
          </Link>
          <Link href="/" className="block text-emerald-600 hover:underline dark:text-emerald-400">
            Powrót na stronę główną
          </Link>
        </div>
      </div>
    </div>
  );
}
