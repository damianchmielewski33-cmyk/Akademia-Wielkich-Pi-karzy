"use client";

import { useState } from "react";
import { Smartphone } from "lucide-react";
import { PitchCard, PitchPageHero, pitchLabelClass } from "@/components/ui/pitch-card";

export default function PobierzClient() {
  const [phoneModel, setPhoneModel] = useState("");
  const [androidVersion, setAndroidVersion] = useState("");
  const [message, setMessage] = useState("Aplikacja nie została zainstalowana");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  async function sendFeedback() {
    setSending(true);
    setSent(null);
    try {
      const r = await fetch("/api/client-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "install_failed",
          message: message.trim() || "Aplikacja nie została zainstalowana",
          phoneModel: phoneModel.trim() || undefined,
          androidVersion: androidVersion.trim() || undefined,
          details: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        }),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => null)) as { error?: string } | null;
        setSent(j?.error || `Błąd wysyłki (${r.status})`);
      } else {
        setSent("Zgłoszenie zapisane — admin zobaczy je w logach Vercel / activity.");
      }
    } catch (e) {
      setSent(e instanceof Error ? e.message : "Brak połączenia");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="awp-page awp-page--narrow">
      <PitchPageHero
        title="Aplikacja na telefon"
        subtitle="Pobierz wersję Android i korzystaj z terminarza, zapisów i portfela bez przeglądarki."
      />

      <PitchCard className="mt-8 text-left" contentClassName="p-6 sm:p-8">
        <span className={pitchLabelClass}>Android</span>
        <h2 className="pitch-heading mt-4 text-xl">Jak zainstalować</h2>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-emerald-100/90">
          <li>
            Sprawdź w telefonie: <strong>Ustawienia → Data i godzina</strong> — włącz „Automatyczna
            data i godzina” (zła data blokuje instalację).
          </li>
          <li>
            Odinstaluj wszystkie stare wersje „Akademia WP” (jeśli są na liście aplikacji).
          </li>
          <li>
            Usuń stare pliki <code className="text-emerald-200">akademia-wp.apk</code> z folderu
            Pobrane.
          </li>
          <li>Kliknij przycisk poniżej i poczekaj na pełne pobranie (~10–15 MB).</li>
          <li>
            Otwórz plik w aplikacji <strong>Pliki</strong> / <strong>Moje pliki</strong> (nie z
            powiadomienia Chrome, jeśli nie działa).
          </li>
          <li>
            Zezwól na instalację z nieznanych źródeł dla Plików/Chrome. Na Xiaomi/HyperOS: włącz też
            „Instaluj przez USB” w opcjach deweloperskich (bez podłączania kabla).
          </li>
          <li>Po Play Protect wybierz „Zainstaluj mimo to” / „I tak zainstaluj”.</li>
          <li>Wymagany Android 8.0+. Zaloguj się: imię, nazwisko i PIN jak na stronie.</li>
        </ol>

        <a
          href="/api/android/download?source=pobierz"
          className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-3.5 text-center text-base font-semibold text-emerald-950 transition hover:bg-emerald-300 sm:w-auto"
        >
          <Smartphone className="size-5 shrink-0" aria-hidden />
          Pobierz aplikację Android (APK)
        </a>

        <p className="mt-4 text-xs leading-relaxed text-emerald-100/60">
          Po udanym buildzie w GitHub Actions plik jest w Releases. Przycisk powyżej loguje próbę
          pobrania i przekierowuje do APK.
        </p>
      </PitchCard>

      <PitchCard className="mt-6 text-left" contentClassName="p-6 sm:p-8">
        <span className={pitchLabelClass}>Problem z instalacją?</span>
        <h2 className="pitch-heading mt-4 text-lg">Zgłoś błąd (logi na Vercel)</h2>
        <p className="mt-2 text-sm text-emerald-100/80">
          Wypełnij krótko — zapisze się w logach serwera, żeby dało się zobaczyć model telefonu i
          komunikat.
        </p>
        <div className="mt-4 space-y-3">
          <label className="block text-sm">
            <span className="text-emerald-100/80">Model telefonu</span>
            <input
              className="mt-1 w-full rounded-lg border border-white/20 bg-black/20 px-3 py-2 text-white"
              value={phoneModel}
              onChange={(e) => setPhoneModel(e.target.value)}
              placeholder="np. Samsung Galaxy A54"
            />
          </label>
          <label className="block text-sm">
            <span className="text-emerald-100/80">Wersja Androida</span>
            <input
              className="mt-1 w-full rounded-lg border border-white/20 bg-black/20 px-3 py-2 text-white"
              value={androidVersion}
              onChange={(e) => setAndroidVersion(e.target.value)}
              placeholder="np. 13 / 14"
            />
          </label>
          <label className="block text-sm">
            <span className="text-emerald-100/80">Komunikat błędu</span>
            <input
              className="mt-1 w-full rounded-lg border border-white/20 bg-black/20 px-3 py-2 text-white"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </label>
          <button
            type="button"
            disabled={sending}
            onClick={() => void sendFeedback()}
            className="rounded-xl bg-white/15 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/25 disabled:opacity-60"
          >
            {sending ? "Wysyłanie…" : "Wyślij zgłoszenie"}
          </button>
          {sent ? <p className="text-sm text-emerald-200">{sent}</p> : null}
        </div>
      </PitchCard>
    </div>
  );
}
