import Link from "next/link";
import { getDb } from "@/lib/db";
import { ALL_PLAYERS } from "@/lib/constants";
import { RegisterForm } from "@/components/register-form";

export default async function RegisterPage() {
  const db = getDb();
  const taken = new Set(
    (db.prepare("SELECT player_alias FROM users").all() as { player_alias: string }[]).map(
      (r) => r.player_alias
    )
  );
  const available = ALL_PLAYERS.filter((p) => !taken.has(p));

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-emerald-100 bg-white/95 p-8 shadow-lg">
        <h1 className="text-center text-2xl font-normal text-emerald-950">Rejestracja</h1>
        <RegisterForm availablePlayers={available} />
        <div className="mt-6 space-y-2 text-center text-sm">
          <Link href="/login" className="block font-medium text-emerald-700 hover:underline">
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
