import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Phone, Clock, MessageSquare, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PitchCard, PitchPageHero, pitchLabelClass } from "@/components/ui/pitch-card";
import { getAppSettings } from "@/lib/app-settings";
import { getDb } from "@/lib/db";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Kontakt – Akademia Wielkich Piłkarzy",
    description: `Skontaktuj się z organizatorami Akademii Wielkich Piłkarzy. Masz pytania dotyczące zapisów, płatności lub organizacji meczów? Chętnie pomożemy! Dane kontaktowe, telefon i e-mail organizatorów.`,
  };
}

export default async function KontaktPage() {
  const db = await getDb();
  const settings = await getAppSettings(db);

  return (
    <div className="awp-page awp-page--default text-center">
      <PitchPageHero
        title="Kontakt"
        subtitle="Masz pytania? Skontaktuj się z organizatorami akademii — chętnie pomożemy!"
      />

      <div className="mx-auto mt-8 max-w-3xl space-y-6 text-left">

        {/* Organizatorzy */}
        <PitchCard contentClassName="p-6 sm:p-8">
          <span className={pitchLabelClass}>Organizatorzy</span>
          <h2 className="pitch-heading mt-2 text-xl sm:text-2xl">Zespół akademii</h2>
          <div className="pitch-rule mt-3 w-28 max-w-full opacity-90" />
          <p className="mt-4 text-sm leading-relaxed text-emerald-100/85">
            Akademia Wielkich Piłkarzy jest prowadzona przez pasjonatów piłki nożnej z wieloletnim doświadczeniem w organizacji rozgrywek amatorskich. Nasi organizatorzy są do Twojej dyspozycji w sprawach dotyczących zapisów, płatności, składów i wszelkich kwestii organizacyjnych.
          </p>
          <div className="mt-6 grid gap-3">
            <OrganizerCard
              name={settings.organizer_damian_name}
              phone={settings.organizer_damian_phone}
              email={settings.organizer_damian_email}
              facebookUrl={settings.facebook_damian_url}
            />
            <OrganizerCard
              name={settings.organizer_mateusz_name}
              phone={settings.organizer_mateusz_phone}
              email={settings.organizer_mateusz_email}
              facebookUrl={settings.facebook_mateusz_url}
            />
          </div>
        </PitchCard>

        {/* Godziny kontaktu */}
        <PitchCard contentClassName="p-6 sm:p-8">
          <span className={pitchLabelClass}>Dostępność</span>
          <h2 className="pitch-heading mt-2 text-xl sm:text-2xl">Kiedy możesz się z nami skontaktować?</h2>
          <div className="pitch-rule mt-3 w-28 max-w-full opacity-90" />
          <div className="mt-5 grid gap-4 text-sm text-emerald-100/90 sm:grid-cols-2">
            <div className="flex gap-3">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
              <div>
                <p className="font-semibold text-white">Dni powszednie</p>
                <p className="mt-1 text-emerald-100/80">Poniedziałek – Piątek<br />16:00 – 21:00</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
              <div>
                <p className="font-semibold text-white">Weekendy</p>
                <p className="mt-1 text-emerald-100/80">Sobota – Niedziela<br />10:00 – 20:00</p>
              </div>
            </div>
            <div className="flex gap-3 sm:col-span-2">
              <MessageSquare className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
              <div>
                <p className="font-semibold text-white">Czas odpowiedzi</p>
                <p className="mt-1 text-emerald-100/80">
                  Staramy się odpowiadać na wszystkie wiadomości w ciągu 24 godzin. W pilnych sprawach dotyczących nadchodzącego meczu prosimy o kontakt telefoniczny.
                </p>
              </div>
            </div>
          </div>
        </PitchCard>

        {/* FAQ kontaktowe */}
        <PitchCard contentClassName="p-6 sm:p-8">
          <span className={pitchLabelClass}>Najczęstsze pytania</span>
          <h2 className="pitch-heading mt-2 text-xl sm:text-2xl">W czym możemy Ci pomóc?</h2>
          <div className="pitch-rule mt-3 w-28 max-w-full opacity-90" />
          <div className="mt-5 space-y-4 text-sm leading-relaxed text-emerald-100/90">
            {[
              {
                q: "Jak dołączyć do akademii?",
                a: "Zarejestruj się na platformie, uzupełnij dane i skontaktuj się z organizatorem, aby potwierdzić uczestnictwo w pierwszym meczu. Szczegóły znajdziesz na stronie O nas.",
              },
              {
                q: "Nie mogę się zalogować na konto.",
                a: "Sprawdź poprawność loginu i hasła. Jeśli problem nadal występuje, skontaktuj się z organizatorem — zresetujemy dostęp do Twojego konta.",
              },
              {
                q: "Jak anulować zapis na mecz?",
                a: "W zakładce Terminarz możesz wypisać się z meczu przed jego rozpoczęciem. Jeśli termin wypisania minął, skontaktuj się bezpośrednio z organizatorem.",
              },
              {
                q: "Mam problem z płatnością lub portfelem.",
                a: "Problemy z płatnościami rozwiązujemy indywidualnie. Skontaktuj się z organizatorem, podając datę transakcji i kwotę — wyjaśnimy sytuację.",
              },
              {
                q: "Chcę zgłosić błąd w statystykach.",
                a: "Jeśli zauważysz błąd w swoich lub cudzych statystykach, poinformuj organizatora podając datę meczu i szczegóły. Poprawimy dane tak szybko, jak to możliwe.",
              },
            ].map((item, i) => (
              <div key={i} className="flex gap-3">
                <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <div>
                  <p className="font-semibold text-white">{item.q}</p>
                  <p className="mt-1 text-emerald-100/80">{item.a}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-lg bg-emerald-900/40 px-4 py-3 text-sm text-emerald-100/80">
            Więcej pytań i odpowiedzi znajdziesz na stronie{" "}
            <Link className="pitch-link" href="/faq">Często zadawane pytania (FAQ)</Link>.
          </div>
        </PitchCard>

      </div>

      <p className="mt-10">
        <Link href="/" className="pitch-link text-sm">
          ← Strona główna
        </Link>
      </p>
    </div>
  );
}

function OrganizerCard({
  name,
  phone,
  email,
  facebookUrl,
}: {
  name: string;
  phone?: string;
  email?: string;
  facebookUrl?: string | null;
}) {
  return (
    <PitchCard showDecorations className="shadow-md shadow-emerald-950/10">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 text-white">
          <p className="text-lg font-bold tracking-tight drop-shadow-sm">{name}</p>
          <div className="mt-2 grid gap-1 text-sm text-emerald-50/95">
            {phone ? (
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4" aria-hidden />
                <span className="font-semibold">{phone}</span>
              </p>
            ) : null}
            {email ? (
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4" aria-hidden />
                <span className="font-medium">{email}</span>
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-2 sm:items-end">
          <div className="flex flex-wrap gap-2">
            {phone ? (
              <Button
                asChild
                variant="secondary"
                className="bg-white/95 text-emerald-950 hover:bg-white dark:bg-zinc-800 dark:text-emerald-100 dark:hover:bg-zinc-700"
              >
                <a href={`tel:${phone.replace(/\s/g, "")}`}>Zadzwoń</a>
              </Button>
            ) : null}
            {email ? (
              <Button
                asChild
                variant="secondary"
                className="bg-white/95 text-emerald-950 hover:bg-white dark:bg-zinc-800 dark:text-emerald-100 dark:hover:bg-zinc-700"
              >
                <a href={`mailto:${email}`}>Napisz email</a>
              </Button>
            ) : null}
            {facebookUrl ? (
              <Button
                asChild
                variant="secondary"
                className="bg-white/95 text-emerald-950 hover:bg-white dark:bg-zinc-800 dark:text-emerald-100 dark:hover:bg-zinc-700"
              >
                <a href={facebookUrl} target="_blank" rel="noreferrer">
                  Facebook
                </a>
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                disabled
                className="bg-white/90 text-emerald-950 dark:bg-zinc-800/80 dark:text-zinc-500"
              >
                Facebook
              </Button>
            )}
          </div>
        </div>
      </div>
    </PitchCard>
  );
}
