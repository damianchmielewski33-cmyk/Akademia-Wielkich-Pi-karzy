import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { UstawPinView } from "@/components/ustaw-pin-view";
import { getServerSession } from "@/lib/auth";
import { PIN_LOGIN_POLICY_LINES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Ustaw PIN",
  description: "Pierwsze ustawienie PIN-u do logowania w akademii.",
};

type Props = {
  searchParams: Promise<{ next?: string; fn?: string; ln?: string }>;
};

export default async function UstawPinPage({ searchParams }: Props) {
  const session = await getServerSession();
  if (session && !session.needsPinSetup) {
    redirect("/");
  }

  const { next: nextPath, fn, ln } = await searchParams;
  const next = nextPath && nextPath.startsWith("/") ? nextPath : "/";

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200/80 bg-white p-8 shadow-sm">
        <h1 className="text-center text-2xl font-bold tracking-tight text-zinc-900">Ustaw PIN</h1>
        <p className="mt-2 text-center text-sm text-zinc-600">
          Potwierdź tożsamość (imię, nazwisko i piłkarz z rejestracji), a następnie wybierz PIN 4–6 cyfr.
        </p>
        <ul className="mt-3 list-inside list-disc space-y-1 text-xs text-zinc-600">
          {PIN_LOGIN_POLICY_LINES.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
        <div className="mt-6">
          <UstawPinView
            nextPath={next}
            initialFirstName={typeof fn === "string" ? fn.trim() : ""}
            initialLastName={typeof ln === "string" ? ln.trim() : ""}
          />
        </div>
        <div className="mt-6 text-center text-sm">
          <Link href="/" className="text-emerald-600 hover:underline">
            ← Strona główna
          </Link>
        </div>
      </div>
    </div>
  );
}
