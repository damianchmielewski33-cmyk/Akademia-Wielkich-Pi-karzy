"use client";

import { useState } from "react";
import { Smartphone, Usb } from "lucide-react";
import { PitchCard, PitchPageHero, pitchLabelClass } from "@/components/ui/pitch-card";

const DIRECT_APK =
  "https://github.com/damianchmielewski33-cmyk/Akademia-Wielkich-Pi-karzy/releases/download/android-latest/akademia-wp.apk";

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
        <h2 className="pitch-heading mt-4 text-xl">Pobierz APK</h2>
        <p className="mt-3 text-sm leading-relaxed text-emerald-100/85">
          Plik ma ok. 10–15 MB. Po pierwszej instalacji kolejne wersje aplikacja może pobrać sama
          (dialog „Dostępna aktualizacja” albo Profil → Sprawdź aktualizacje).
        </p>

        <a
          href="/api/android/download?source=pobierz"
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-3.5 text-center text-base font-semibold text-emerald-950 transition hover:bg-emerald-300 sm:w-auto"
        >
          <Smartphone className="size-5 shrink-0" aria-hidden />
          Pobierz aplikację Android (APK)
        </a>

        <p className="mt-3 text-xs text-emerald-100/55">
          Alternatywnie bezpośredni link:{" "}
          <a href={DIRECT_APK} className="underline hover:text-emerald-200">
            GitHub Releases
          </a>
        </p>
      </PitchCard>

      <PitchCard className="mt-6 text-left" contentClassName="p-6 sm:p-8">
        <span className={pitchLabelClass}>Samsung</span>
        <h2 className="pitch-heading mt-4 text-lg flex items-center gap-2">
          <Usb className="size-5 shrink-0" aria-hidden />
          Jeśli „Moje pliki” nie instaluje
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-emerald-100/85">
          Na Galaxy (np. S10) system często blokuje instalację z pobranego APK, mimo że plik jest
          poprawny. Działa wtedy instalacja z komputera przez USB (ADB) — tak udało się u nas na
          S10+.
        </p>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-emerald-100/90">
          <li>
            Ustawienia → Informacje o oprogramowaniu → 7× Numer kompilacji → włącz{" "}
            <strong>Debugowanie USB</strong>.
          </li>
          <li>Pobierz APK na komputer (przycisk powyżej albo link GitHub).</li>
          <li>
            Podłącz telefon kablem, w PowerShell:
            <code className="mt-2 block rounded-lg bg-black/30 p-3 text-xs text-emerald-100">
              adb install -r &quot;C:\ścieżka\do\akademia-wp.apk&quot;
            </code>
          </li>
          <li>
            Jak zobaczysz <code className="text-emerald-200">Success</code> — apka jest na telefonie
            (Akademia WP).
          </li>
        </ol>
      </PitchCard>

      <PitchCard className="mt-6 text-left" contentClassName="p-6 sm:p-8">
        <span className={pitchLabelClass}>Problem z instalacją?</span>
        <h2 className="pitch-heading mt-4 text-lg">Zgłoś błąd (logi na Vercel)</h2>
        <p className="mt-2 text-sm text-emerald-100/80">
          Wypełnij krótko — zapisze się w logach serwera (model telefonu i komunikat).
        </p>
        <div className="mt-4 space-y-3">
          <label className="block text-sm">
            <span className="text-emerald-100/80">Model telefonu</span>
            <input
              className="mt-1 w-full rounded-lg border border-white/20 bg-black/20 px-3 py-2 text-white"
              value={phoneModel}
              onChange={(e) => setPhoneModel(e.target.value)}
              placeholder="np. Samsung Galaxy S10+"
            />
          </label>
          <label className="block text-sm">
            <span className="text-emerald-100/80">Wersja Androida</span>
            <input
              className="mt-1 w-full rounded-lg border border-white/20 bg-black/20 px-3 py-2 text-white"
              value={androidVersion}
              onChange={(e) => setAndroidVersion(e.target.value)}
              placeholder="np. 12"
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
