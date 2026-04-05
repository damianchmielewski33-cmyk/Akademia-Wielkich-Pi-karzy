import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/lib/db";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
  title: "Logowanie",
  description: "Zaloguj się do konta zawodnika akademii.",
};

type Props = { searchParams: Promise<{ next?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { next: nextPath } = await searchParams;
  const db = getDb();
  const rows = db.prepare("SELECT player_alias FROM users ORDER BY player_alias").all() as {
    player_alias: string;
  }[];
  const aliases = rows.map((r) => r.player_alias);

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200/80 bg-white p-8 shadow-sm">
        <h1 className="text-center text-2xl font-bold tracking-tight text-zinc-900">Logowanie</h1>
        <p className="mt-2 text-center text-sm text-zinc-600">Wpisz dane i wybierz swojego zawodnika</p>
        <LoginForm aliases={aliases} nextPath={nextPath && nextPath.startsWith("/") ? nextPath : "/"} />
        <div className="mt-6 space-y-2 text-center text-sm">
          <Link href="/register" className="block font-medium text-emerald-700 hover:underline">
            Nie masz konta? Zarejestruj się
          </Link>
          <Link href="/" className="block text-emerald-600 hover:underline">
            ← Powrót na stronę główną
          </Link>
        </div>
      </div>
    </div>
  );
}
