import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { PitchCard, pitchLabelClass } from "@/components/ui/pitch-card";
import { PIN_LOGIN_POLICY_LINES } from "@/lib/constants";

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
      <PitchCard as="div" className="w-full max-w-md" contentClassName="p-8">
        <span className={`${pitchLabelClass} block text-center`}>Szatnia</span>
        <h1 className="mt-2 text-center text-2xl font-bold tracking-tight text-white">Logowanie</h1>
        <p className="mt-2 text-center text-sm text-emerald-100/90">
          Wpisz imię, nazwisko i PIN (4–6 cyfr)
        </p>
        {wylogowano === "bezczynnosc" ? (
          <p className="pitch-panel mt-3 border-amber-200/40 bg-amber-500/15 px-3 py-2 text-center text-sm text-amber-50">
            Wylogowano z powodu braku aktywności (30 min). Zaloguj się ponownie — możesz zaznaczyć „Nie wylogowuj
            mnie”, aby tego uniknąć.
          </p>
        ) : null}
        <ul className="mt-3 list-inside list-disc space-y-1 text-xs text-emerald-100/85">
          {PIN_LOGIN_POLICY_LINES.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
        <LoginForm nextPath={nextPath && nextPath.startsWith("/") ? nextPath : "/"} />
        <div className="mt-6 space-y-2 text-center text-sm">
          <Link
            href={
              nextPath && nextPath.startsWith("/") && nextPath !== "/"
                ? `/register?next=${encodeURIComponent(nextPath)}`
                : "/register"
            }
            className="pitch-link block"
          >
            Nie masz konta? Zarejestruj się
          </Link>
          <Link href="/" className="pitch-link block text-emerald-100/80">
            ← Powrót na stronę główną
          </Link>
        </div>
      </PitchCard>
    </div>
  );
}
