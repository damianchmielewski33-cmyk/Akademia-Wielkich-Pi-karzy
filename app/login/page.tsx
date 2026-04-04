import Link from "next/link";
import { getDb } from "@/lib/db";
import { LoginForm } from "@/components/login-form";

type Props = { searchParams: Promise<{ next?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { next: nextPath } = await searchParams;
  const db = getDb();
  const rows = db.prepare("SELECT player_alias FROM users ORDER BY player_alias").all() as {
    player_alias: string;
  }[];
  const aliases = rows.map((r) => r.player_alias);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-emerald-100 bg-white/95 p-8 shadow-lg backdrop-blur">
        <h1 className="text-center text-3xl font-light text-emerald-950">🔐 Logowanie</h1>
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
