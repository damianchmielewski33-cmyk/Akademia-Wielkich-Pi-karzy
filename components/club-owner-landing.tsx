"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-field";

export function ClubOwnerLanding() {
  const router = useRouter();
  const [token, setToken] = useState("");

  function openInvite(e: React.FormEvent) {
    e.preventDefault();
    const value = token.trim().replace(/^.*\/partner\/zaproszenie\//, "");
    if (!value) return;
    router.push(`/partner/zaproszenie/${encodeURIComponent(value)}`);
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--mp-teal-dark)]">Dla obiektów</p>
      <h1 className="mt-2 text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl dark:text-white">
        Wystaw boisko. Przyjmuj rezerwacje online.
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-zinc-600 dark:text-zinc-300">
        Tak działają kluby na rynku: gracze szukają godziny, płacą od razu, a Ty widzisz obłożenie i sam ustawiasz cennik.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          { t: "Twoje terminy", d: "Godziny otwarcia stają się wolnymi slotami w grafiku." },
          { t: "Twój cennik", d: "Cena bazowa, weekend i szczyt — bez dzwonienia na recepcję." },
          { t: "Twoje rezerwacje", d: "Potwierdzenia, blokady i rozliczenie z akademią w jednym panelu." },
        ].map((item) => (
          <article key={item.t} className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="font-black">{item.t}</h2>
            <p className="mt-2 text-sm text-zinc-500">{item.d}</p>
          </article>
        ))}
      </div>

      <section className="mt-10 rounded-3xl bg-zinc-950 p-6 text-white sm:p-8">
        <h2 className="text-2xl font-black">Masz link zaproszenia?</h2>
        <p className="mt-2 text-white/75">Wklej cały adres albo sam token — otworzymy panel partnera.</p>
        <form onSubmit={openInvite} className="mt-5 flex flex-col gap-3 sm:flex-row">
          <FormInput
            label="Link lub token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="sm:flex-1 [&_label]:text-white/70"
          />
          <Button type="submit" className="sm:self-end">
            Otwórz zaproszenie
          </Button>
        </form>
        <p className="mt-4 text-sm text-white/60">
          Nie masz jeszcze linku? Napisz do akademii z{" "}
          <Link href="/kontakt" className="underline underline-offset-2">
            formularza kontaktu
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
