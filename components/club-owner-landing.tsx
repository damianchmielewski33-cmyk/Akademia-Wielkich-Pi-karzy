"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/app-toast";
import { Button } from "@/components/ui/button";
import { FormInput, FormTextarea } from "@/components/ui/form-field";

export function ClubOwnerLanding() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    venue_name: "",
    city: "Warszawa",
    address: "",
    description: "",
    website: "",
    note: "",
  });

  function openInvite(e: React.FormEvent) {
    e.preventDefault();
    const value = token.trim().replace(/^.*\/partner\/zaproszenie\//, "");
    if (!value) return;
    router.push(`/partner/zaproszenie/${encodeURIComponent(value)}`);
  }

  async function submitApplication(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/partner/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Nie udało się wysłać zgłoszenia");
        return;
      }
      setSent(true);
      toast.success("Zgłoszenie wysłane. Po weryfikacji dostaniesz maila.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--mp-teal-dark)]">Dla obiektów</p>
      <h1 className="mt-2 text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl dark:text-white">
        Wystaw boisko. Przyjmuj rezerwacje online.
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-zinc-600 dark:text-zinc-300">
        Zgłoś halę bez tokenu od znajomych. Po weryfikacji publikujemy obiekt — gracze rezerwują i płacą, Ty widzisz
        obrót, prowizję 15% i termin przelewu.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          { t: "Twoje terminy", d: "Godziny otwarcia stają się wolnymi slotami w grafiku." },
          { t: "Twój cennik", d: "Cena bazowa, weekend i szczyt — bez dzwonienia na recepcję." },
          { t: "Twoje wypłaty", d: "Widać ile weszło, ile prowizja, ile dostaniesz i kiedy przelew." },
        ].map((item) => (
          <article key={item.t} className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="font-black">{item.t}</h2>
            <p className="mt-2 text-sm text-zinc-500">{item.d}</p>
          </article>
        ))}
      </div>

      <section className="mt-10 rounded-3xl border border-[var(--mp-teal)] bg-white p-6 shadow-sm sm:p-8 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-2xl font-black">Zgłoś halę</h2>
        <p className="mt-2 text-sm text-zinc-500">
          Bez zaproszenia. Priorytet: Warszawa, komplet zdjęć, cennik, godziny, oświetlenie.
        </p>
        {sent ? (
          <p className="mt-6 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
            Dziękujemy. Sprawdzimy dane i wrócimy mailem — potem dodasz boiska, zdjęcia i publikację.
          </p>
        ) : (
          <form onSubmit={(e) => void submitApplication(e)} className="mt-6 grid gap-3 sm:grid-cols-2">
            <FormInput
              label="Imię i nazwisko"
              value={form.contact_name}
              onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
              required
            />
            <FormInput
              label="E-mail"
              type="email"
              value={form.contact_email}
              onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
              required
            />
            <FormInput
              label="Telefon"
              value={form.contact_phone}
              onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
              required
            />
            <FormInput
              label="Nazwa obiektu"
              value={form.venue_name}
              onChange={(e) => setForm({ ...form, venue_name: e.target.value })}
              required
            />
            <FormInput
              label="Miasto"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              required
            />
            <FormInput
              label="Adres"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              required
            />
            <FormInput
              label="Strona www (opcjonalnie)"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              className="sm:col-span-2"
            />
            <FormTextarea
              label="Krótki opis (oświetlenie, szatnie, parking)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="sm:col-span-2"
            />
            <FormTextarea
              label="Uwagi dla weryfikacji"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className="sm:col-span-2"
            />
            <Button type="submit" disabled={busy} className="sm:col-span-2 font-black uppercase tracking-[0.12em]">
              {busy ? "Wysyłanie..." : "Wyślij zgłoszenie"}
            </Button>
          </form>
        )}
      </section>

      <section className="mt-8 rounded-3xl bg-zinc-950 p-6 text-white sm:p-8">
        <h2 className="text-2xl font-black">Masz już link zaproszenia?</h2>
        <p className="mt-2 text-white/75">To stara ścieżka dla znajomych obiektów. Wklej adres albo token.</p>
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
          Pytania?{" "}
          <Link href="/kontakt" className="underline underline-offset-2">
            Formularz kontaktu
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
