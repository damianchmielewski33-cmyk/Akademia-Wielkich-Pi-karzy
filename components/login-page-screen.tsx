import Link from "next/link";
import { KeyRound, ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/login-form";
import { SiteAssetImage } from "@/components/site-asset-image";
import { PIN_LOGIN_POLICY_LINES } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Props = {
  siteName: string;
  nextPath: string;
  idleLogout?: boolean;
};

export function LoginPageScreen({ siteName, nextPath, idleLogout }: Props) {
  const registerHref =
    nextPath && nextPath !== "/" ? `/register?next=${encodeURIComponent(nextPath)}` : "/register";

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 py-10 md:py-14 lg:py-16">
      <div
        className={cn(
          "overflow-hidden rounded-3xl border border-emerald-900/15 bg-white shadow-[0_24px_80px_-24px_rgba(5,80,55,0.45)]",
          "dark:border-emerald-800/30 dark:bg-zinc-950 dark:shadow-[0_24px_80px_-24px_rgba(0,0,0,0.65)]",
          "md:grid md:min-h-[34rem] md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]"
        )}
      >
        <section
          className={cn(
            "relative flex flex-col items-center justify-center overflow-hidden px-8 py-12 text-center md:px-10 md:py-14",
            "bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950"
          )}
          aria-label="Marka akademii"
        >
          <div
            className="pointer-events-none absolute inset-0 bg-[image:var(--awp-bg-stadium)] bg-cover bg-center opacity-[0.18]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-emerald-950/90 via-emerald-950/40 to-emerald-900/20"
            aria-hidden
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 opacity-30" aria-hidden>
            <SiteAssetImage asset="bg_pitch_lines" decorative fill className="object-cover object-bottom" sizes="50vw" />
          </div>

          <div className="relative z-10 flex w-full max-w-xs flex-col items-center">
            <div
              className={cn(
                "mb-6 flex h-32 w-32 items-center justify-center rounded-2xl p-5",
                "bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] ring-1 ring-white/20 backdrop-blur-sm",
                "md:h-36 md:w-36 md:rounded-3xl md:p-6"
              )}
            >
              <SiteAssetImage
                asset="logo_login"
                alt={siteName}
                width={256}
                height={256}
                priority
                className="h-full w-full drop-shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
                sizes="(max-width: 768px) 128px, 144px"
              />
            </div>

            <p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-200/80">Szatnia</p>
            <h1 className="mt-2 font-display text-3xl font-semibold leading-tight tracking-wide text-white md:text-4xl">
              {siteName}
            </h1>
            <p className="mt-3 max-w-[18rem] text-sm leading-relaxed text-emerald-100/85">
              Zaloguj się imieniem, nazwiskiem i PIN-em — zarządzaj zapisami, profilem i płatnościami w jednym miejscu.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs font-medium text-emerald-100/75">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/10">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-200" aria-hidden />
                Bezpieczny PIN
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/10">
                <KeyRound className="h-3.5 w-3.5 text-emerald-200" aria-hidden />
                4–6 cyfr
              </span>
            </div>
          </div>
        </section>

        <section className="flex flex-col justify-center px-6 py-10 sm:px-10 md:px-12 md:py-14" aria-label="Formularz logowania">
          <div className="mx-auto w-full max-w-md">
            <h2 className="text-2xl font-bold tracking-tight text-emerald-950 dark:text-emerald-50">Logowanie</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Wpisz imię, nazwisko i PIN przypisany do Twojego konta zawodnika.
            </p>

            {idleLogout ? (
              <p className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-100">
                Wylogowano z powodu braku aktywności (30 min). Zaloguj się ponownie — możesz zaznaczyć „Nie wylogowuj
                mnie”, aby tego uniknąć.
              </p>
            ) : null}

            <details className="group mt-4 rounded-xl border border-zinc-200/80 bg-zinc-50/80 open:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-zinc-700 marker:content-none dark:text-zinc-300 [&::-webkit-details-marker]:hidden">
                <span className="text-emerald-700 group-open:text-emerald-800 dark:text-emerald-300">Zasady PIN-u</span>
                <span className="ml-2 text-xs font-normal text-zinc-500 dark:text-zinc-500">(kliknij, aby rozwinąć)</span>
              </summary>
              <ul className="space-y-1 border-t border-zinc-200/80 px-4 py-3 text-xs leading-relaxed text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
                {PIN_LOGIN_POLICY_LINES.map((line, i) => (
                  <li key={i} className="list-inside list-disc">
                    {line}
                  </li>
                ))}
              </ul>
            </details>

            <LoginForm nextPath={nextPath} />

            <div className="mt-8 space-y-2 border-t border-zinc-100 pt-6 text-center text-sm dark:border-zinc-800">
              <Link href={registerHref} className="block font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200">
                Nie masz konta? Zarejestruj się
              </Link>
              <Link
                href="/"
                className="block text-zinc-500 transition-colors hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                ← Powrót na stronę główną
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
