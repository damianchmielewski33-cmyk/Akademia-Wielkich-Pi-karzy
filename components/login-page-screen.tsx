import Link from "next/link";
import { AuthPageShell } from "@/components/auth-page-shell";
import { LoginForm } from "@/components/login-form";
import { PIN_LOGIN_POLICY_LINES } from "@/lib/constants";

type Props = {
  siteName: string;
  nextPath: string;
  idleLogout?: boolean;
  emailPasswordAuthEnabled?: boolean;
};

export function LoginPageScreen({
  siteName,
  nextPath,
  idleLogout,
  emailPasswordAuthEnabled = false,
}: Props) {
  const registerHref =
    nextPath && nextPath !== "/" ? `/register?next=${encodeURIComponent(nextPath)}` : "/register";

  return (
    <AuthPageShell
      kicker="Akademia"
      title="Gramy razem."
      subtitle="Zaloguj się, żeby rezerwować boiska, opłacać terminy i korzystać z terminarza akademii."
      formKicker="Konto gracza"
      formTitle="Logowanie"
      formSubtitle={
        <>
          <p>
            {emailPasswordAuthEnabled
              ? "Zaloguj się e-mailem i hasłem. Stare konto bez e-maila? Użyj opcji logowania PIN-em."
              : "Wpisz imię, nazwisko i PIN (4–6 cyfr) — tak jak na stronie startowej."}
          </p>
          {!emailPasswordAuthEnabled ? (
          <details className="group mt-3 rounded-xl border border-white/20 bg-black/20 open:bg-black/30">
            <summary className="cursor-pointer list-none px-3 py-2 text-sm font-semibold text-white marker:content-none [&::-webkit-details-marker]:hidden">
              Zasady PIN-u
              <span className="ml-2 text-xs font-normal text-white/70">(kliknij, aby rozwinąć)</span>
            </summary>
            <ul className="space-y-1 border-t border-white/15 px-3 py-2 text-xs leading-relaxed text-white/80">
              {PIN_LOGIN_POLICY_LINES.map((line, i) => (
                <li key={i} className="list-inside list-disc">
                  {line}
                </li>
              ))}
            </ul>
          </details>
          ) : null}
        </>
      }
      tiles={[
        {
          href: registerHref,
          title: "Utwórz konto",
          desc: "Dołącz na stałe i zapisuj się na mecze.",
          photoIndex: 5,
        },
        {
          href: "/",
          title: "Strona główna",
          desc: "Wróć do terminarza i rankingów.",
          photoIndex: 6,
        },
      ]}
      steps={[
        { n: "1", t: "Zaloguj się", d: emailPasswordAuthEnabled ? "E-mail i hasło (albo PIN na starym koncie)." : "Imię, nazwisko i PIN akademii." },
        { n: "2", t: "Zapisz się", d: "Potwierdź udział albo zaznacz, że jeszcze nie wiesz." },
        { n: "3", t: "Graj i licz punkty", d: "Statystyki i rankingi po każdym spotkaniu." },
      ]}
      footerTitle="Chcesz grać z nami?"
      footerText={`Dołącz do ${siteName}: terminarz, składy, portfel i rankingi po zalogowaniu.`}
      footerHref={registerHref}
      footerLabel="Dołącz do akademii"
    >
      <LoginForm nextPath={nextPath} />
      {idleLogout ? (
        <p className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Wylogowano z powodu braku aktywności (30 min). Zaloguj się ponownie — możesz zaznaczyć „Nie wylogowuj mnie”,
          aby tego uniknąć.
        </p>
      ) : null}
      <p className="mt-4 text-center text-sm text-zinc-600">
        Nie masz konta?{" "}
        <Link href={registerHref} className="font-bold text-zinc-950 underline-offset-2 hover:underline">
          Zarejestruj się
        </Link>
      </p>
    </AuthPageShell>
  );
}
