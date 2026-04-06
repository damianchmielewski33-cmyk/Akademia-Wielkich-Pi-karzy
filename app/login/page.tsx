import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/login-form";
import { LoginIntroTooltip } from "@/components/login-intro-tooltip";
import { LoginPendingPinList } from "@/components/login-pending-pin-list";
import { ALL_PLAYERS, PIN_LOGIN_POLICY_LINES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Logowanie",
  description: "Zaloguj się do konta zawodnika akademii.",
};

type Props = { searchParams: Promise<{ next?: string; setup?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { next: nextPath, setup } = await searchParams;

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200/80 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Logowanie</h1>
          <LoginIntroTooltip />
        </div>
        <p className="mt-2 text-center text-sm text-zinc-600">
          Wpisz imię, nazwisko i PIN (4–6 cyfr)
        </p>
        <ul className="mt-3 list-inside list-disc space-y-1 text-xs text-zinc-600">
          {PIN_LOGIN_POLICY_LINES.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
        <LoginPendingPinList />
        <LoginForm
          aliases={ALL_PLAYERS}
          nextPath={nextPath && nextPath.startsWith("/") ? nextPath : "/"}
          openInitialPinOnMount={setup === "1"}
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
