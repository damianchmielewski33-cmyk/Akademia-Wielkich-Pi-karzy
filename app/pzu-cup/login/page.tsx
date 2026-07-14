import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/login-form";
import { PIN_LOGIN_POLICY_LINES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Logowanie",
  description: "Logowanie do konta PZU Cup.",
};

type Props = { searchParams: Promise<{ next?: string; wylogowano?: string }> };

export default async function PzuCupLoginPage({ searchParams }: Props) {
  const { next: nextPath, wylogowano } = await searchParams;

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-sky-400/30 bg-sky-950/50 p-8 shadow-2xl">
        <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-amber-400">PZU Cup</p>
        <h1 className="mt-2 text-center text-2xl font-bold text-white">Logowanie turniejowe</h1>
        <p className="mt-2 text-center text-sm text-sky-200/85">
          To osobne konto — nie logujesz się tu danymi z Akademii (chyba że masz uprawnienie organizatora).
        </p>
        {wylogowano === "bezczynnosc" ? (
          <p className="mt-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-center text-sm text-amber-100">
            Wylogowano z powodu braku aktywności.
          </p>
        ) : null}
        <ul className="mt-3 list-inside list-disc space-y-1 text-xs text-sky-200/80">
          {PIN_LOGIN_POLICY_LINES.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
        <LoginForm
          nextPath={nextPath && nextPath.startsWith("/pzu-cup") ? nextPath : "/pzu-cup"}
          realm="pzu_cup"
        />
        <div className="mt-6 space-y-2 text-center text-sm">
          <Link href="/pzu-cup/register" className="block font-semibold text-sky-300 hover:text-white">
            Nie masz konta? Zarejestruj się w turnieju
          </Link>
          <Link href="/pzu-cup" className="block text-sky-200/70 hover:text-white">
            ← Powrót do PZU Cup
          </Link>
        </div>
      </div>
    </div>
  );
}
