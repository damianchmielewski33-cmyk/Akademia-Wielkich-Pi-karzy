import type { Metadata } from "next";
import Link from "next/link";
import { PitchCard, PitchPageHero, pitchLabelClass } from "@/components/ui/pitch-card";
import { getAppSettings } from "@/lib/app-settings";
import { getDb } from "@/lib/db";
import { getSiteUrl, SELLER_FULL_ADDRESS, SELLER_LEGAL_NAME } from "@/lib/site";

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
  const email = settings.contact_email?.trim() || settings.organizer_damian_email?.trim() || "";
  const sellerName = settings.organizer_damian_name?.trim() || SELLER_LEGAL_NAME;
  const siteName = settings.site_name;
  const siteUrl = getSiteUrl();

  const hasCommission =
    (settings.hotpay_commission_pct > 0 || settings.hotpay_commission_fixed > 0);

  // Przykład prowizji dla kwoty 50 PLN
  const exampleNet = 50;
  const pct = settings.hotpay_commission_pct;
  const fixed = settings.hotpay_commission_fixed;
  const exampleGross =
    hasCommission
      ? Math.ceil(((exampleNet + fixed) / (1 - pct / 100)) * 100) / 100
      : exampleNet;

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
          <p className="text-xs text-emerald-100/70">Ostatnia aktualizacja: 9 sierpnia 2026</p>

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
              <strong className="text-white">Sprzedawca / usługodawca</strong> (podmiot
              oferujący usługi odpłatne w Serwisie, w tym wpisowe i doładowanie portfela):
            </p>
            <ul className="mt-2 list-none space-y-1 rounded-xl border border-white/20 bg-black/15 px-4 py-3 text-emerald-50">
              <li>
                <span className="text-emerald-100/70">Imię i nazwisko: </span>
                <strong className="text-white">{sellerName}</strong>
              </li>
              <li>
                <span className="text-emerald-100/70">Adres: </span>
                <strong className="text-white">{SELLER_FULL_ADDRESS}</strong>
              </li>
              <li>
                <span className="text-emerald-100/70">Adres e-mail: </span>
                <a className="pitch-link font-semibold" href={`mailto:${email}`}>
                  {email}
                </a>
              </li>
            </ul>
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
              miejsc, lokalizacja, termin oraz zasady opłaty wynikają z informacji widocznych przy
              danym meczu lub z ustawień akademii.
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
                zawodnik może przelać środki z własnego portfela na portfel innego zawodnika akademii
                (przelew wewnętrzny P2P) — operacja jest nieodwracalna w Serwisie, z wyjątkiem
                korekty przez administratora;
              </li>
              <li>
                <strong className="text-white">koszyk meczowy</strong> pozwala opłacić wpisowe za
                siebie i/lub innych zapisanych zawodników z portfela (lub HotPay przy braku środków);
                po opłaceniu oznaczani są jako opłaceni na danym meczu;
              </li>
              <li>
                <strong className="text-white">cena składki (wpisowego) za mecz zależy od liczby
                zapisanych graczy</strong>
                : łączny koszt organizacji meczu (np. wynajem boiska) jest dzielony między
                uczestników zapisanych na dany mecz — im więcej zapisanych, tym niższa składka na
                osobę; ostateczna kwota na zawodnika jest ustalana przy rozliczeniu meczu;
              </li>
              <li>
                do czasu rozliczenia w Serwisie może być widoczna orientacyjna / domyślna kwota
                wpisowego (np. z ustawień akademii lub niedopłaty na portfelu) — nie zawsze jest to
                ostateczna składka za konkretny mecz; kwota zapłacona w koszyku może różnić się od
                ostatecznej składki — różnicę rozlicza administrator;
              </li>
              <li>
                obciążenie portfela za mecz (rozliczenie) jest dokonywane przez administratora po
                rozegraniu lub w ramach zasad akademii; osoby już opłacone koszykiem nie są
                ponownie obciążane w rozliczeniu;
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
              Płatności online przyjmowane są na rzecz sprzedawcy wskazanego w § 1 (
              {sellerName}, {SELLER_FULL_ADDRESS}, e-mail:{" "}
              <a className="pitch-link" href={`mailto:${email}`}>
                {email}
              </a>
              ). Operatorem płatności online jest HotPay (ePłatności sp. z o.o. sp. k. / PayPro —
              zgodnie z aktualnymi danymi operatora prezentowanymi w procesie płatności).
            </p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>
                płatność inicjowana jest w Serwisie (np. „Ureguluj saldo”, „Doładuj saldo” lub
                koszyk meczowy), a następnie realizowana w bramce HotPay;
              </li>
              <li>
                po otrzymaniu potwierdzenia płatności od operatora środki są automatycznie
                księgowane na saldzie portfela użytkownika; w przypadku koszyka meczowego
                Serwis dodatkowo oznacza wybranych zawodników jako opłaconych;
              </li>
              <li>
                cena / kwota do zapłaty jest przedstawiana przed rozpoczęciem płatności; kwoty są
                wyrażone w PLN;
              </li>
              {hasCommission && (
                <li>
                  <strong className="text-white">prowizja operatora płatności</strong> —
                  kwota przekazywana do bramki płatniczej jest{" "}
                  <strong className="text-white">wyższa</strong> niż kwota księgowana na portfelu,
                  ponieważ zawiera koszt obsługi płatności online (prowizję operatora). Różnica ta
                  nie jest zwracana — stanowi koszt realizacji płatności kartą / BLIK online.
                  {pct > 0 && fixed > 0 && (
                    <>
                      {" "}Prowizja wynosi {pct.toFixed(pct % 1 === 0 ? 0 : 2)}% +{" "}
                      {fixed.toFixed(2).replace(".", ",")} zł.{" "}
                    </>
                  )}
                  {pct > 0 && fixed === 0 && (
                    <> Prowizja wynosi {pct.toFixed(pct % 1 === 0 ? 0 : 2)}% kwoty. </>
                  )}
                  {pct === 0 && fixed > 0 && (
                    <> Prowizja wynosi {fixed.toFixed(2).replace(".", ",")} zł (kwota stała). </>
                  )}
                  Przykład: aby zaksięgować{" "}
                  <strong className="text-white">{exampleNet},00 zł</strong> na portfelu, kwota
                  pobrana w bramce płatniczej wyniesie{" "}
                  <strong className="text-white">{exampleGross.toFixed(2).replace(".", ",")} zł</strong>;
                </li>
              )}
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
                przy <strong className="text-white">wypisaniu się</strong> z meczu przed terminem,
                jeśli wpisowe było opłacone koszykiem, Serwis automatycznie zwraca kwotę koszyka na
                portfel płatnika;
              </li>
              <li>
                przy <strong className="text-white">odwołaniu meczu</strong> przez organizatora
                Serwis zwraca na portfele płatników kwoty z ukończonych koszyków meczowych;
              </li>
              <li>
                zwrot niewykorzystanego salda lub wpłaty poza powyższymi przypadkami jest możliwy w
                uzasadnionych sytuacjach po kontakcie z organizatorem (np. oczywisty błąd płatności,
                podwójna wpłata), o ile środki nie zostały już przeznaczone na rozliczenie meczu;
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
            <h2 className="pitch-heading text-lg">10. Wizerunek i media społecznościowe</h2>
            <p className="mt-2">
              Uczestnicząc w meczach i aktywnościach organizowanych przez akademię, zawodnik
              wyraża zgodę na nieodpłatne utrwalenie i rozpowszechnianie swojego wizerunku
              (zdjęcia, nagrania wideo) wykonanego podczas tych wydarzeń.
            </p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>
                materiały mogą być publikowane na profilu akademii w serwisach społecznościowych,
                w tym na <strong className="text-white">Instagramie</strong>, w celu dokumentacji
                rozgrywek i promocji akademii;
              </li>
              <li>
                wizerunek nie będzie wykorzystywany w celach komercyjnych na rzecz podmiotów
                trzecich bez odrębnej zgody zawodnika;
              </li>
              <li>
                zawodnik, który nie wyraża zgody na publikację swojego wizerunku, powinien
                poinformować o tym organizatora przed lub podczas wydarzenia — na adres e-mail:{" "}
                <a className="pitch-link" href={`mailto:${email}`}>
                  {email}
                </a>
                ; organizator dołoży starań, aby materiały z wizerunkiem tej osoby nie były
                publikowane;
              </li>
              <li>
                w sprawach dotyczących usunięcia już opublikowanych materiałów z wizerunkiem
                zawodnik może zwrócić się do organizatora na ww. adres e-mail.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="pitch-heading text-lg">11. Dane osobowe</h2>
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
            <h2 className="pitch-heading text-lg">12. Zmiany regulaminu</h2>
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
            <h2 className="pitch-heading text-lg">13. Postanowienia końcowe</h2>
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
