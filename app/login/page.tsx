import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { ALL_PLAYERS, PIN_LOGIN_POLICY_LINES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Logowanie",
  description: "Zaloguj się do konta zawodnika akademii.",
};

type Props = { searchParams: Promise<{ next?: string; setup?: string; wylogowano?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { next: nextPath, setup, wylogowano } = await searchParams;

  if (setup === "1") {
    const q = new URLSearchParams();
    if (nextPath && nextPath.startsWith("/")) q.set("next", nextPath);
    redirect(q.size ? `/ustaw-pin?${q}` : "/ustaw-pin");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200/80 bg-white p-8 shadow-sm">
        <h1 className="text-center text-2xl font-bold tracking-tight text-zinc-900">Logowanie</h1>
        <p className="mt-2 text-center text-sm text-zinc-600">
          Wpisz imię, nazwisko i PIN (4–6 cyfr)
        </p>
        {wylogowano === "bezczynnosc" ? (
          <p className="mt-3 rounded-lg border border-amber-200/90 bg-amber-50/90 px-3 py-2 text-center text-sm text-amber-950">
            Wylogowano z powodu braku aktywności (30 min). Zaloguj się ponownie — możesz zaznaczyć „Nie wylogowuj
            mnie”, aby tego uniknąć.
          </p>
        ) : null}
        <ul className="mt-3 list-inside list-disc space-y-1 text-xs text-zinc-600">
          {PIN_LOGIN_POLICY_LINES.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
        <LoginForm
          aliases={ALL_PLAYERS}
          nextPath={nextPath && nextPath.startsWith("/") ? nextPath : "/"}
        />
        <div className="mt-6 space-y-2 text-center text-sm">
          <Link
            href={
              nextPath && nextPath.startsWith("/") && nextPath !== "/"
                ? `/register?next=${encodeURIComponent(nextPath)}`
                : "/register"
            }
            className="block font-medium text-emerald-700 hover:underline"
          >
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
