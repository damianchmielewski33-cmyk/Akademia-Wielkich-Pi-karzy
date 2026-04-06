import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/lib/db";
import { ALL_PLAYERS } from "@/lib/constants";
import { RegisterForm } from "@/components/register-form";

export const metadata: Metadata = {
  title: "Rejestracja",
  description: "Załóż konto i dołącz do akademii.",
};

type PageProps = { searchParams: Promise<{ next?: string }> };

export default async function RegisterPage({ searchParams }: PageProps) {
  const { next: nextRaw } = await searchParams;
  const nextPath = nextRaw && nextRaw.startsWith("/") ? nextRaw : undefined;
  const db = await getDb();
  const taken = new Set(
    (await db.prepare("SELECT player_alias FROM users").all() as { player_alias: string }[]).map(
      (r) => r.player_alias
    )
  );
  const available = ALL_PLAYERS.filter((p) => !taken.has(p));

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200/80 bg-white p-8 shadow-sm">
        <h1 className="text-center text-2xl font-bold tracking-tight text-zinc-900">Rejestracja</h1>
        <p className="mt-2 text-center text-sm text-zinc-600">
          Kolejność jak przy logowaniu: imię i nazwisko, potem piłkarz (awatar), na końcu PIN (4–6 cyfr) — tym PIN-em będziesz się logować.
        </p>
        <RegisterForm availablePlayers={available} nextPath={nextPath} />
        <div className="mt-6 space-y-2 text-center text-sm">
          <Link
            href={nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login"}
            className="block font-medium text-emerald-700 hover:underline"
          >
            Masz już konto? Zaloguj się
          </Link>
          <Link href="/" className="block text-emerald-600 hover:underline">
            Powrót na stronę główną
          </Link>
        </div>
      </div>
    </div>
  );
}
