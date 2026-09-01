import Link from "next/link";
import { AuthPageShell } from "@/components/auth-page-shell";
import { RegisterForm } from "@/components/register-form";
import { Button } from "@/components/ui/button";
import { PIN_LOGIN_POLICY_LINES } from "@/lib/constants";

type Props = {
  siteName: string;
  nextPath?: string;
  closed?: boolean;
};

export function RegisterPageScreen({ siteName, nextPath, closed = false }: Props) {
  const loginHref = nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login";

  return (
    <AuthPageShell
      kicker="Akademia"
      title="Chcesz grać z nami?"
      subtitle={
        closed
          ? "Rejestracja jest tymczasowo zamknięta — poproś organizatora o konto albo zaloguj się, jeśli już je masz."
          : "Dołącz do akademii: terminarz, składy, portfel i rankingi po założeniu konta."
      }
      formKicker="Dołącz do drużyny"
      formTitle={closed ? "Rejestracja zamknięta" : "Rejestracja"}
      formSubtitle={
        closed ? (
          <p>
            Administrator wyłączył samodzielne zakładanie kont. Napisz do organizatora albo przejdź do logowania, jeśli
            masz już dostęp.
          </p>
        ) : (
          <>
            <p>Imię, nazwisko, pseudonim piłkarza i PIN — tym samym PIN-em będziesz się logować.</p>
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
          </>
        )
      }
      tiles={[
        {
          href: loginHref,
          title: "Zaloguj się",
          desc: "PIN akademii — tak jak na starcie.",
          photoIndex: 5,
        },
        {
          href: closed ? "/kontakt" : "/",
          title: closed ? "Kontakt" : "Strona główna",
          desc: closed ? "Napisz do organizatora akademii." : "Zobacz terminarz i rankingi.",
          photoIndex: 6,
        },
      ]}
      steps={[
        { n: "1", t: "Załóż konto", d: "Pseudonim piłkarza i PIN na 4–6 cyfr." },
        { n: "2", t: "Zapisz się", d: "Potwierdź udział na najbliższy mecz." },
        { n: "3", t: "Graj i licz punkty", d: "Statystyki i rankingi po każdym spotkaniu." },
      ]}
      footerTitle={closed ? "Masz już konto?" : "Kolejny mecz czeka w terminarzu."}
      footerText={
        closed
          ? "Zaloguj się PIN-em albo skontaktuj się z organizatorzem."
          : `Dołącz do ${siteName}: zapisy, składy i statystyki są w jednym miejscu.`
      }
      footerHref={closed ? loginHref : "/terminarz"}
      footerLabel={closed ? "Zaloguj się" : "Otwórz terminarz"}
    >
      {closed ? (
        <div className="space-y-3">
          <Button asChild variant="default" className="w-full rounded-full font-bold">
            <Link href={loginHref}>Przejdź do logowania</Link>
          </Button>
          <p className="text-center text-sm text-zinc-600">
            <Link href="/kontakt" className="font-bold text-zinc-950 underline-offset-2 hover:underline">
              Skontaktuj się z organizatorem
            </Link>
          </p>
        </div>
      ) : (
        <>
          <RegisterForm nextPath={nextPath} />
          <p className="mt-4 text-center text-sm text-zinc-600">
            Masz już konto?{" "}
            <Link href={loginHref} className="font-bold text-zinc-950 underline-offset-2 hover:underline">
              Zaloguj się
            </Link>
          </p>
        </>
      )}
    </AuthPageShell>
  );
}
