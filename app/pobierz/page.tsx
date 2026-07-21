import type { Metadata } from "next";
import { Smartphone } from "lucide-react";
import { PitchCard, PitchPageHero, pitchLabelClass } from "@/components/ui/pitch-card";

export const metadata: Metadata = {
  title: "Pobierz aplikację",
  description: "Aplikacja Android Akademii Wielkich Piłkarzy — pobierz APK na telefon.",
};

const APK_URL =
  process.env.NEXT_PUBLIC_ANDROID_APK_URL?.trim() ||
  "https://github.com/damianchmielewski33-cmyk/Akademia-Wielkich-Pi-karzy/releases/latest/download/akademia-wp.apk";

export default function PobierzPage() {
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
          <li>Kliknij przycisk poniżej i pobierz plik <strong>akademia-wp.apk</strong>.</li>
          <li>Otwórz pobrany plik na telefonie.</li>
          <li>
            Jeśli Android zapyta o zgodę — zezwól na instalację z tego źródła (to normalne poza Google
            Play).
          </li>
          <li>Zaloguj się tak jak na stronie: imię, nazwisko i PIN.</li>
        </ol>

        <a
          href={APK_URL}
          className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-3.5 text-center text-base font-semibold text-emerald-950 transition hover:bg-emerald-300 sm:w-auto"
        >
          <Smartphone className="size-5 shrink-0" aria-hidden />
          Pobierz aplikację Android (APK)
        </a>

        <p className="mt-4 text-xs leading-relaxed text-emerald-100/60">
          Plik pochodzi z GitHub Releases tego projektu. Jeśli link nie działa, administrator musi
          najpierw uruchomić build w GitHub → Actions → „Build Android APK”.
        </p>
      </PitchCard>
    </div>
  );
}
