import type { Metadata } from "next";
import Link from "next/link";
import { PitchCard, PitchPageHero, pitchLabelClass } from "@/components/ui/pitch-card";
import { getAppSettings } from "@/lib/app-settings";
import { getDb } from "@/lib/db";
import { getSiteUrl } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const db = await getDb();
  const settings = await getAppSettings(db);
  return {
    title: "Regulamin",
    description: `Regulamin serwisu i płatności ${settings.site_name}.`,
  };
}

export default async function RegulaminPage() {
  const db = await getDb();
  const settings = await getAppSettings(db);
  const email = settings.contact_email;
  const siteName = settings.site_name;
  const siteUrl = getSiteUrl();

  return (
    <div className="awp-page awp-page--narrow">
      <PitchPageHero
        title="Regulamin"
        subtitle={
          <>
            Zasady korzystania z serwisu i płatności w{" "}
            <strong className="font-semibold text-white">{siteName}</strong>.
          </>
        }
      />

      <PitchCard className="mt-8 text-left" contentClassName="p-6 sm:p-8">
        <span className={pitchLabelClass}>Regulamin</span>
        <div className="mt-4 space-y-5 text-sm leading-relaxed text-emerald-100/90">
          <p className="text-xs text-emerald-100/70">Ostatnia aktualizacja: 4 sierpnia 2026</p>

          <section>
            <h2 className="pitch-heading text-lg">1. Postanowienia ogólne</h2>
            <p className="mt-2">
              Niniejszy Regulamin określa zasady korzystania z serwisu internetowego {siteName}{" "}
              dostępnego pod adresem{" "}
              <a className="pitch-link" href={siteUrl}>
                {siteUrl}
              </a>{" "}
              („Serwis”) oraz zasady płatności związanych z udziałem w meczach i aktywnościach
              akademii.
            </p>
            <p className="mt-2">
              Organizatorem Serwisu i podmiotem odpowiedzialnym za świadczenie usług w ramach
              akademii jest organizator Akademii Wielkich Piłkarzy. Kontakt:{" "}
              <a className="pitch-link" href={`mailto:${email}`}>
                {email}
              </a>
              .
            </p>
            <p className="mt-2">
              Korzystanie z Serwisu, w szczególności rejestracja konta, zapis na mecz lub dokonanie
              płatności, oznacza akceptację niniejszego Regulaminu.
            </p>
          </section>

          <section>
            <h2 className="pitch-heading text-lg">2. Charakter usług</h2>
            <p className="mt-2">
              Serwis służy organizacji amatorskiej działalności piłkarskiej: terminarza meczów,
              zapisów, składów, statystyk, komunikacji oraz rozliczeń wpisowego.
            </p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>Serwis nie prowadzi sklepu internetowego z towarami fizycznymi;</li>
              <li>
                płatności dotyczą przede wszystkim wpisowego na mecze / treningi oraz doładowania
                salda portfela zawodnika;
              </li>
              <li>
                udział w meczach i aktywnościach akademii ma charakter rekreacyjny / amatorski.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="pitch-heading text-lg">3. Konto użytkownika</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>korzystanie z części funkcji wymaga założenia konta i zalogowania;</li>
              <li>użytkownik podaje dane zgodne z prawdą (imię, nazwisko, nick zawodnika);</li>
              <li>użytkownik chroni dane logowania (w tym PIN) i nie udostępnia ich osobom trzecim;</li>
              <li>
                organizator może ograniczyć lub zawiesić dostęp do konta w razie naruszenia
                Regulaminu, nadużyć lub działań zagrażających bezpieczeństwu Serwisu.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="pitch-heading text-lg">4. Zapisy na mecze</h2>
            <p className="mt-2">
              Zapis na mecz odbywa się poprzez funkcje Serwisu (terminarz / zaproszenia). Liczba
              miejsc, lokalizacja, termin oraz ewentualna opłata wynikają z informacji widocznych
              przy danym meczu lub z ustawień akademii.
            </p>
            <p className="mt-2">
              Organizator zastrzega możliwość odwołania, przełożenia lub zmiany szczegółów meczu z
              przyczyn organizacyjnych, pogodowych lub innych niezależnych. O istotnych zmianach
              użytkownicy są informowani w miarę możliwości poprzez Serwis lub kontakt bezpośredni.
            </p>
          </section>

          <section>
            <h2 className="pitch-heading text-lg">5. Portfel i wpisowe</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>
                każdy zawodnik posiada w Serwisie saldo portfela służące do rozliczeń wpisowego;
              </li>
              <li>
                doładowanie salda może nastąpić płatnością online (HotPay) albo innym sposobem
                wskazanym w Serwisie (np. BLIK na telefon — po potwierdzeniu przez administratora);
              </li>
              <li>
                kwota wpisowego może wynikać z niedopłaty na portfelu, domyślnej opłaty w ustawieniach
                lub rozliczenia konkretnego meczu przez administratora;
              </li>
              <li>
                obciążenie portfela za mecz (rozliczenie) jest dokonywane przez administratora po
                rozegraniu lub w ramach zasad akademii;
              </li>
              <li>
                saldo portfela nie jest rachunkiem bankowym ani środkami depozytowymi w rozumieniu
                prawa bankowego — służy wyłącznie rozliczeniom w ramach akademii.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="pitch-heading text-lg">6. Płatności online (HotPay)</h2>
            <p className="mt-2">
              Operatorem płatności online jest HotPay (ePłatności sp. z o.o. sp. k. / PayPro —
              zgodnie z aktualnymi danymi operatora prezentowanymi w procesie płatności).
            </p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>
                płatność inicjowana jest w Serwisie (np. „Zapłać za mecz” lub „Doładuj saldo”), a
                następnie realizowana w bramce HotPay;
              </li>
              <li>
                po otrzymaniu potwierdzenia płatności od operatora środki są automatycznie
                księgowane na saldzie portfela użytkownika;
              </li>
              <li>
                cena / kwota do zapłaty jest przedstawiana przed rozpoczęciem płatności; kwoty są
                wyrażone w PLN;
              </li>
              <li>
                w razie problemów z płatnością użytkownik powinien skontaktować się z organizatorem
                (e-mail powyżej) oraz — w razie potrzeby — z obsługą HotPay.
              </li>
            </ul>
            <p className="mt-2">
              Organizator nie przechowuje pełnych danych kart płatniczych. Przetwarzanie danych w
              związku z płatnościami opisuje także{" "}
              <Link className="pitch-link" href="/polityka-prywatnosci">
                polityka prywatności
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="pitch-heading text-lg">7. Reklamacje</h2>
            <p className="mt-2">
              Reklamacje dotyczące działania Serwisu, zapisów, salda portfela lub płatności należy
              zgłaszać na adres{" "}
              <a className="pitch-link" href={`mailto:${email}`}>
                {email}
              </a>
              , podając: nick / imię i nazwisko, opis problemu oraz — jeśli dotyczy — identyfikator
              płatności lub datę i kwotę wpłaty.
            </p>
            <p className="mt-2">
              Organizator rozpatruje reklamację w terminie do 14 dni od jej otrzymania i informuje
              o wyniku na adres e-mail wskazany w zgłoszeniu lub powiązany z kontem.
            </p>
          </section>

          <section>
            <h2 className="pitch-heading text-lg">8. Odstąpienie od umowy i zwroty</h2>
            <p className="mt-2">
              Usługi Serwisu obejmują udział w wydarzeniach sportowych / rekreacyjnych o określonym
              terminie oraz rozliczenia wewnętrzne akademii.
            </p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>
                doładowanie portfela i wpisowe służą pokryciu kosztów organizacji meczów (np.
                wynajem boiska) i nie stanowią klasycznej sprzedaży towaru;
              </li>
              <li>
                zwrot niewykorzystanego salda lub wpłaty jest możliwy w uzasadnionych przypadkach po
                kontakcie z organizatorem (np. oczywisty błąd płatności, podwójna wpłata), o ile
                środki nie zostały już przeznaczone na rozliczenie meczu;
              </li>
              <li>
                w przypadku odwołania meczu przez organizatora zasady zwrotu lub przeniesienia
                salda ustala organizator i komunikuje uczestnikom;
              </li>
              <li>
                jeśli przepisy o prawach konsumenta mają zastosowanie do konkretnej płatności,
                użytkownik może skorzystać z uprawnień wynikających z tych przepisów, o ile nie
                zachodzą wyjątki ustawowe (m.in. dotyczące usług związanych z wydarzeniami
                rozrywkowymi lub sportowymi o określonej dacie).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="pitch-heading text-lg">9. Odpowiedzialność</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>
                udział w meczach i treningach odbywa się na własną odpowiedzialność zawodnika;
                organizator dąży do bezpiecznej organizacji, lecz nie gwarantuje braku urazów;
              </li>
              <li>
                Serwis jest udostępniany „w stanie, w jakim jest”; organizator dokłada starań, aby
                działał prawidłowo, lecz mogą występować przerwy techniczne;
              </li>
              <li>
                organizator nie odpowiada za przerwy lub błędy po stronie operatora płatności,
                banków, hostingu lub łącza internetowego użytkownika, o ile wynikają z przyczyn
                niezależnych od organizatora.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="pitch-heading text-lg">10. Dane osobowe</h2>
            <p className="mt-2">
              Zasady przetwarzania danych osobowych określa{" "}
              <Link className="pitch-link" href="/polityka-prywatnosci">
                polityka prywatności
              </Link>
              . Informacje o plikach cookies:{" "}
              <Link className="pitch-link" href="/cookies">
                polityka cookies
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="pitch-heading text-lg">11. Zmiany regulaminu</h2>
            <p className="mt-2">
              Organizator może zmienić Regulamin z ważnych przyczyn (zmiany prawa, zmiana sposobu
              płatności, rozwój Serwisu). Aktualna treść jest zawsze dostępna pod adresem{" "}
              <Link className="pitch-link" href="/regulamin">
                {siteUrl}/regulamin
              </Link>
              . Data ostatniej aktualizacji znajduje się na początku dokumentu.
            </p>
          </section>

          <section>
            <h2 className="pitch-heading text-lg">12. Postanowienia końcowe</h2>
            <p className="mt-2">
              W sprawach nieuregulowanych zastosowanie mają przepisy prawa polskiego. Ewentualne
              spory strony będą starały się rozwiązać polubownie, a w razie braku porozumienia —
              przed właściwym sądem powszechnym.
            </p>
            <p className="mt-2">
              Pytania dotyczące Regulaminu:{" "}
              <a className="pitch-link" href={`mailto:${email}`}>
                {email}
              </a>
              .
            </p>
          </section>
        </div>
      </PitchCard>

      <p className="mt-10 text-center">
        <Link href="/" className="pitch-link text-sm">
          ← Strona główna
        </Link>
      </p>
    </div>
  );
}
