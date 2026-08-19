import type { Metadata } from "next";
import Link from "next/link";
import { Trophy, Users, BarChart2, Smartphone, Target, Star, Shield } from "lucide-react";
import { PitchCard, PitchPageHero, pitchLabelClass } from "@/components/ui/pitch-card";
import { getAppSettings } from "@/lib/app-settings";
import { getDb } from "@/lib/db";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "O nas – Akademia Wielkich Piłkarzy",
    description: `Akademia Wielkich Piłkarzy to miejsce, gdzie pasja do futbolu spotyka się z profesjonalną organizacją. Dowiedz się więcej o naszej akademii piłkarskiej, metodach treningowych i wartościach, które nami kierują.`,
  };
}

export default async function ONasPage() {
  const db = await getDb();
  const settings = await getAppSettings(db);
  const email = settings.contact_email;
  const siteName = settings.site_name;

  return (
    <div className="awp-page awp-page--narrow">
      <PitchPageHero
        title="O akademii"
        subtitle={
          <>
            Poznaj {siteName} — miejsce, gdzie piłkarska pasja spotyka się z nowoczesną organizacją.
          </>
        }
      />

      {/* Misja i wartości */}
      <PitchCard className="mt-8 text-left" contentClassName="p-6 sm:p-8">
        <span className={pitchLabelClass}>Nasza misja</span>
        <h2 className="pitch-heading mt-2 text-xl sm:text-2xl">Kim jesteśmy?</h2>
        <div className="pitch-rule mt-3 w-28 max-w-full opacity-90" />
        <div className="mt-5 space-y-4 text-sm leading-relaxed text-emerald-100/90">
          <p>
            <strong className="text-white">Akademia Wielkich Piłkarzy</strong> to amatorska akademia piłkarska tworzona przez miłośników futbolu dla miłośników futbolu. Naszym celem jest stworzenie przestrzeni, w której każdy — niezależnie od poziomu umiejętności — może regularnie grać w piłkę nożną, rozwijać się sportowo i budować trwałe relacje z ludźmi dzielącymi tę samą pasję.
          </p>
          <p>
            Działamy na zasadach pełnej transparentności: każdy zawodnik ma dostęp do własnych statystyk, historii meczów i składów drużynowych. Wierzymy, że regularność i zaangażowanie są kluczem do prawdziwego postępu — zarówno na boisku, jak i poza nim.
          </p>
          <p>
            Akademia łączy podejście sportowe z nowoczesnymi narzędziami cyfrowymi — dedykowana platforma internetowa i aplikacja mobilna pozwalają wygodnie zarządzać zapisami, śledzić statystyki oraz być na bieżąco z harmonogramem treningów i meczy.
          </p>
        </div>
      </PitchCard>

      {/* Wartości */}
      <PitchCard className="mt-6 text-left" contentClassName="p-6 sm:p-8">
        <span className={pitchLabelClass}>Wartości</span>
        <h2 className="pitch-heading mt-2 text-xl sm:text-2xl">Co nas wyróżnia?</h2>
        <div className="pitch-rule mt-3 w-28 max-w-full opacity-90" />
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {[
            {
              icon: <Trophy className="h-5 w-5 text-emerald-400" />,
              title: "Duch rywalizacji",
              desc: "Każdy mecz to szansa na pokazanie swojego potencjału. Zdrowa rywalizacja motywuje do ciągłego doskonalenia umiejętności i gry na najwyższym możliwym poziomie.",
            },
            {
              icon: <Users className="h-5 w-5 text-emerald-400" />,
              title: "Wspólnota",
              desc: "Akademia to nie tylko boisko — to społeczność ludzi, którzy łączy miłość do piłki. Budujemy relacje, które trwają długo poza treningami i meczami.",
            },
            {
              icon: <Target className="h-5 w-5 text-emerald-400" />,
              title: "Regularność",
              desc: "Systematyczne granie to klucz do progresu. Nasz terminarz zapewnia regularne mecze, a system zapisów gwarantuje, że każdy zawodnik znajdzie miejsce na boisku.",
            },
            {
              icon: <Star className="h-5 w-5 text-emerald-400" />,
              title: "Uczciwa gra",
              desc: "Fair play to fundament akademii. Szanujemy siebie nawzajem, gramy czysto i dbamy o to, by każde spotkanie było pozytywnym doświadczeniem dla wszystkich uczestników.",
            },
            {
              icon: <BarChart2 className="h-5 w-5 text-emerald-400" />,
              title: "Mierzalny postęp",
              desc: "Śledź swoje gole, asysty, dystans i obrony. Nasze statystyki i rankingi pomagają zobaczyć realny postęp i motywują do jeszcze cięższej pracy.",
            },
            {
              icon: <Shield className="h-5 w-5 text-emerald-400" />,
              title: "Bezpieczeństwo",
              desc: "Dbamy o bezpieczeństwo każdego zawodnika — zarówno na boisku, jak i w kwestii danych osobowych. Transparentność i ochrona prywatności są dla nas priorytetem.",
            },
          ].map((item) => (
            <div key={item.title} className="flex gap-3">
              <div className="mt-0.5 shrink-0">{item.icon}</div>
              <div>
                <h3 className="font-semibold text-white">{item.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-emerald-100/80">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </PitchCard>

      {/* Jak działamy */}
      <PitchCard className="mt-6 text-left" contentClassName="p-6 sm:p-8">
        <span className={pitchLabelClass}>Jak to działa?</span>
        <h2 className="pitch-heading mt-2 text-xl sm:text-2xl">Organizacja akademii</h2>
        <div className="pitch-rule mt-3 w-28 max-w-full opacity-90" />
        <div className="mt-5 space-y-5 text-sm leading-relaxed text-emerald-100/90">
          <div>
            <h3 className="font-semibold text-white text-base">Zapisy na mecz</h3>
            <p className="mt-2">
              Terminy nadchodzących meczów i treningów znajdziesz w zakładce{" "}
              <Link className="pitch-link" href="/terminarz">Terminarz</Link>.
              Zapis jest możliwy po założeniu konta i zalogowaniu się do platformy. Liczba miejsc na każdy mecz jest ograniczona — gdy skład jest kompletny, system automatycznie informuje o braku wolnych miejsc.
            </p>
            <p className="mt-2">
              Jeśli zapisałeś się na mecz, ale nie możesz wziąć udziału, możesz się wypisać bezpośrednio w terminarzu — zwolnisz w ten sposób miejsce dla innego zawodnika. To uczciwe podejście, które pozwala każdemu mieć równe szanse na grę.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-white text-base">Składy i taktyka</h3>
            <p className="mt-2">
              Ustawienia drużyn na boisku publikuje administrator akademii przed każdym meczem. Po udostępnieniu możesz sprawdzić skład w sekcji{" "}
              <Link className="pitch-link" href="/sklady">Składy</Link>.
              Archiwum poprzednich meczów pozwala analizować historię i obserwować zmiany w formacji i taktyce.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-white text-base">Statystyki i rankingi</h3>
            <p className="mt-2">
              Po każdym rozegranym meczu zawodnicy mogą uzupełniać swoje wyniki: gole, asysty, pokonany dystans i obrony. Dane te gromadzą się w osobistych{" "}
              <Link className="pitch-link" href="/statystyki">Statystykach</Link>{" "}
              oraz w zbiorczych{" "}
              <Link className="pitch-link" href="/rankingi">Rankingach</Link>,
              które pokazują porównanie wszystkich zawodników akademii. To znakomity sposób, by śledzić własny postęp i zobaczyć, jak wypada się na tle kolegów z drużyny.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-white text-base">Portfel i płatności</h3>
            <p className="mt-2">
              Akademia korzysta z wbudowanego systemu portfela cyfrowego. Dzięki temu opłaty za mecze są proste, przejrzyste i w pełni rozliczalne. Historia transakcji jest zawsze dostępna w panelu użytkownika.
            </p>
          </div>
        </div>
      </PitchCard>

      {/* Aplikacja mobilna */}
      <PitchCard className="mt-6 text-left" contentClassName="p-6 sm:p-8">
        <span className={pitchLabelClass}>Technologia</span>
        <h2 className="pitch-heading mt-2 text-xl sm:text-2xl">Platforma i aplikacja mobilna</h2>
        <div className="pitch-rule mt-3 w-28 max-w-full opacity-90" />
        <div className="mt-5 space-y-3 text-sm leading-relaxed text-emerald-100/90">
          <p>
            Platforma akademii jest dostępna zarówno przez przeglądarkę internetową, jak i jako dedykowana aplikacja na urządzenia z systemem Android. Aplikacja mobilna zapewnia szybki dostęp do terminarza, zapisów, portfela i powiadomień o nadchodzących meczach.
          </p>
          <p>
            Użytkownicy Androida mogą pobrać aplikację APK bezpośrednio ze strony — na górze ekranu pojawi się pasek z przyciskiem pobierania. Aplikacja działa bez pośrednictwa sklepu, co zapewnia szybkie aktualizacje i niezależność od zewnętrznych platform.
          </p>
          <p>
            Platforma obsługuje również powiadomienia push — możesz otrzymywać informacje o nowych terminach, zmianach w składzie i ważnych komunikatach akademii bezpośrednio na swój telefon.
          </p>
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-900/40 px-4 py-3">
            <Smartphone className="h-5 w-5 shrink-0 text-emerald-400" />
            <p className="text-xs text-emerald-100/80">
              Aplikacja dostępna na Androida. Na górze strony znajdziesz przycisk pobierania APK.
            </p>
          </div>
        </div>
      </PitchCard>

      {/* Dołącz do akademii */}
      <PitchCard className="mt-6 text-left" contentClassName="p-6 sm:p-8">
        <span className={pitchLabelClass}>Dołącz do nas</span>
        <h2 className="pitch-heading mt-2 text-xl sm:text-2xl">Jak zostać zawodnikiem akademii?</h2>
        <div className="pitch-rule mt-3 w-28 max-w-full opacity-90" />
        <div className="mt-5 space-y-3 text-sm leading-relaxed text-emerald-100/90">
          <p>
            Dołączenie do akademii jest proste. Wystarczy założyć konto na platformie, podając swoje dane i wybierając unikalny pseudonim zawodniczy. Po rejestracji otrzymasz dostęp do pełnej funkcjonalności systemu.
          </p>
          <p>
            Nowi zawodnicy są weryfikowani przez administrację akademii, co zapewnia bezpieczeństwo społeczności i gwarantuje, że wszyscy gracze znają się z boiska. Wszelkie pytania dotyczące dołączenia do akademii kieruj na adres e-mail lub bezpośrednio do organizatorów.
          </p>
          <p>
            Kontakt z organizatorami:{" "}
            <a className="pitch-link" href={`mailto:${email}`}>{email}</a>.
            Możesz również skorzystać z formularza kontaktowego dostępnego na stronie{" "}
            <Link className="pitch-link" href="/kontakt">Kontakt</Link>.
          </p>
          <p className="mt-2 text-xs text-emerald-100/70">
            Konto w serwisie służy wyłącznie do zapisów i statystyk w ramach działalności akademii. Nie udostępniaj swojego hasła innym osobom. Dane są chronione zgodnie z{" "}
            <Link className="pitch-link" href="/polityka-prywatnosci">Polityką prywatności</Link>.
          </p>
        </div>
      </PitchCard>

      {/* CTA */}
      <div className="mt-8 flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-center">
        <Link
          href="/register"
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-400"
        >
          Zarejestruj się
        </Link>
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 px-6 py-2.5 text-sm font-semibold text-emerald-300 transition hover:border-emerald-400 hover:text-emerald-200"
        >
          Czytaj nasz blog →
        </Link>
      </div>

      <p className="mt-8 text-center">
        <Link href="/" className="pitch-link text-sm">
          ← Strona główna
        </Link>
      </p>
    </div>
  );
}
