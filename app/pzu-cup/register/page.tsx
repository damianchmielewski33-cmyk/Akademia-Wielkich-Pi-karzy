import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/register-form";

export const metadata: Metadata = {
  title: "Rejestracja",
  description: "Rejestracja konta PZU Cup.",
};

export default function PzuCupRegisterPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-sky-400/30 bg-sky-950/50 p-8 shadow-2xl">
        <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-amber-400">PZU Cup</p>
        <h1 className="mt-2 text-center text-2xl font-bold text-white">Rejestracja turniejowa</h1>
        <p className="mt-2 text-center text-sm text-sky-200/85">
          Tworzysz osobne konto — nie łączy się z kontem Akademii Wielkich Piłkarzy.
        </p>
        <RegisterForm nextPath="/pzu-cup" realm="pzu_cup" />
        <div className="mt-6 space-y-2 text-center text-sm">
          <Link href="/pzu-cup/login" className="block font-semibold text-sky-300 hover:text-white">
            Masz już konto? Zaloguj się
          </Link>
          <Link href="/pzu-cup" className="block text-sky-200/70 hover:text-white">
            ← Powrót do PZU Cup
          </Link>
        </div>
      </div>
    </div>
  );
}
