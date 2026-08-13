import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { PitchCard, PitchPageHero, pitchLabelClass } from "@/components/ui/pitch-card";

export const metadata: Metadata = {
  title: "FAQ – Często zadawane pytania | Akademia Wielkich Piłkarzy",
  description:
    "Odpowiedzi na najczęściej zadawane pytania dotyczące Akademii Wielkich Piłkarzy. Dowiedz się, jak dołączyć do akademii, jak działają zapisy, płatności, statystyki i aplikacja mobilna.",
};

const faqCategories = [
  {
    category: "Dołączenie do akademii",
    items: [
      {
        q: "Jak zostać zawodnikiem Akademii Wielkich Piłkarzy?",
        a: "Aby dołączyć do akademii, należy zarejestrować konto na platformie internetowej. Po rejestracji skontaktuj się z jednym z organizatorów (dane na stronie Kontakt), który potwierdzi Twoje uczestnictwo i zaprosi na pierwsze spotkanie. Akademia jest otwarta dla amatorów w różnym wieku i o różnym poziomie umiejętności.",
      },
      {
        q: "Czy trzeba mieć doświadczenie piłkarskie, żeby dołączyć?",
        a: "Nie, akademia jest otwarta dla wszystkich miłośników piłki nożnej — od zupełnych początkujących po doświadczonych graczy. Najważniejsza jest chęć do gry i sportowe nastawienie. Każdy znajdzie tu swoje miejsce, niezależnie od poziomu zaawansowania.",
      },
      {
        q: "Ile kosztuje uczestnictwo w akademii?",
        a: "Koszty uczestnictwa w poszczególnych meczach są ustalane przez organizatorów i płacone za pośrednictwem wbudowanego portfela cyfrowego. Szczegółowe informacje o opłatach udzielą organizatorzy podczas pierwszego kontaktu.",
      },
      {
        q: "Czy mogę zaprosić znajomego do akademii?",
        a: "Jak najbardziej! Zachęcamy do zapraszania znajomych. Nowy zawodnik powinien samodzielnie zarejestrować konto na platformie, a następnie potwierdzić swój udział z organizatorem. Im większa społeczność, tym lepsza organizacja i więcej meczów do wyboru.",
      },
    ],
  },
  {
    category: "Zapisy i terminarz",
    items: [
      {
        q: "Jak zapisać się na mecz?",
        a: "Po zalogowaniu przejdź do zakładki Terminarz. Zobaczysz listę nadchodzących meczów z informacją o dostępnych miejscach. Kliknij wybrany termin i potwierdź zapis. Jeśli mecz jest już pełny, zostaniesz poinformowany o braku wolnych miejsc.",
      },
      {
        q: "Ile miejsc jest dostępnych na każdy mecz?",
        a: "Liczba miejsc zależy od konkretnego meczu i formatu gry (np. 5v5, 6v6, 7v7). Informacja o dostępnych miejscach jest zawsze widoczna przy każdym terminie w zakładce Terminarz.",
      },
      {
        q: "Co zrobić, jeśli nie mogę przyjść na mecz, na który się zapisałem?",
        a: "Możesz wypisać się z meczu bezpośrednio w zakładce Terminarz — wystarczy kliknąć przy danym terminie opcję wypisania. Dzięki temu zwolnisz miejsce dla innego zawodnika. Jeśli termin wypisania już minął, skontaktuj się z organizatorem.",
      },
      {
        q: "Jak wcześnie pojawiają się nowe terminy meczów?",
        a: "Organizatorzy publikują nowe terminy zwykle z wyprzedzeniem kilku dni do tygodnia. Możesz włączyć powiadomienia push w aplikacji, żeby być automatycznie informowanym o nowych terminach.",
      },
      {
        q: "Czy mogę się zapisać w imieniu kogoś innego?",
        a: "Nie — każdy zawodnik musi samodzielnie się zapisywać ze swojego konta. Dzięki temu system poprawnie śledzi statystyki i obecność każdego gracza.",
      },
    ],
  },
  {
    category: "Statystyki i rankingi",
    items: [
      {
        q: "Jakie statystyki są śledzone?",
        a: "Platforma śledzi gole, asysty, pokonany dystans i obrony. Po każdym meczu możesz samodzielnie uzupełnić swoje wyniki w sekcji Statystyki. Dane kumulują się przez cały sezon, tworząc kompletny obraz Twojej aktywności w akademii.",
      },
      {
        q: "Czy statystyki są weryfikowane przez organizatorów?",
        a: "Statystyki są wprowadzane samodzielnie przez zawodników, jednak organizatorzy mają możliwość ich weryfikacji i korekty. Prosimy o rzetelne uzupełnianie danych — to podstawa uczciwy rankingów.",
      },
      {
        q: "Jak działają rankingi?",
        a: "Rankingi porównują zawodników akademii pod kątem różnych kategorii: gole, asysty, łączne punkty (gole + asysty) i inne. Możesz sprawdzić swoje miejsce na tle całej społeczności. Rankingi aktualizują się na bieżąco po każdym wprowadzeniu statystyk.",
      },
      {
        q: "Co zrobić, jeśli moje statystyki są błędne?",
        a: "Skontaktuj się z organizatorem, podając datę meczu i szczegółowy opis błędu. Korekty dokonuje administrator — nie możesz samodzielnie edytować już zatwierdzonych danych.",
      },
    ],
  },
  {
    category: "Konto i bezpieczeństwo",
    items: [
      {
        q: "Zapomniałem hasła — co zrobić?",
        a: "Skontaktuj się z organizatorem akademii. Po weryfikacji Twojej tożsamości zresetujemy dostęp do konta. Z przyczyn bezpieczeństwa nie udostępniamy automatycznego resetu hasła — każda prośba jest obsługiwana ręcznie.",
      },
      {
        q: "Czy mogę zmienić swój pseudonim zawodniczy?",
        a: "Zmiana pseudonimu jest możliwa wyłącznie przez administratora. Skontaktuj się z organizatorem, podając aktualny i nowy pseudonim. Pamiętaj, że pseudonim jest widoczny dla innych zawodników w rankingach i składach.",
      },
      {
        q: "Jak chronione są moje dane osobowe?",
        a: "Twoje dane są przetwarzane zgodnie z RODO. Szczegółowe informacje znajdziesz w Polityce prywatności. Dane nie są udostępniane osobom trzecim i są przechowywane na zabezpieczonych serwerach.",
      },
      {
        q: "Co to jest PIN i do czego służy?",
        a: "PIN to dodatkowe zabezpieczenie Twojego konta w aplikacji mobilnej. Ustawiasz go podczas pierwszego logowania i używasz przy każdym uruchomieniu aplikacji. PIN chroni dostęp do Twojego konta i portfela w przypadku utraty telefonu.",
      },
    ],
  },
  {
    category: "Płatności i portfel",
    items: [
      {
        q: "Jak działa portfel cyfrowy?",
        a: "Portfel to wbudowany system przedpłatowy. Możesz doładować saldo kartą lub BLIKiem, a następnie używać środków do opłacania udziału w meczach. Historia transakcji jest zawsze dostępna w Twoim profilu.",
      },
      {
        q: "Jak doładować portfel?",
        a: "W sekcji Płatności możesz doładować portfel kartą płatniczą lub BLIKiem. Płatności obsługuje system HotPay. Środki są natychmiast dostępne po zaksięgowaniu transakcji.",
      },
      {
        q: "Czy mogę otrzymać zwrot za nieobecność?",
        a: "Zasady zwrotów są opisane w Regulaminie akademii. W przypadku wątpliwości skontaktuj się z organizatorem — każda sytuacja jest rozpatrywana indywidualnie.",
      },
    ],
  },
  {
    category: "Aplikacja mobilna",
    items: [
      {
        q: "Jak zainstalować aplikację na Androidzie?",
        a: "Na urządzeniu z Androidem wejdź na stronę akademii w przeglądarce. U góry strony pojawi się baner z przyciskiem pobierania pliku APK. Kliknij go, a następnie postępuj zgodnie z instrukcjami instalacji. Może być konieczne zezwolenie na instalację z nieznanych źródeł w ustawieniach telefonu.",
      },
      {
        q: "Czy aplikacja jest dostępna na iPhone'a (iOS)?",
        a: "Obecnie dedykowana aplikacja APK jest dostępna wyłącznie na Androidzie. Użytkownicy iPhone'ów mogą korzystać z pełnej funkcjonalności platformy przez przeglądarkę Safari. Strona obsługuje tryb PWA — możesz ją dodać do ekranu głównego, żeby korzystać jak z aplikacji.",
      },
      {
        q: "Jak włączyć powiadomienia push?",
        a: "Po zalogowaniu platforma zapyta o zgodę na powiadomienia. Możesz ją wyrazić w dowolnym momencie w ustawieniach przeglądarki lub aplikacji. Powiadomienia informują o nowych terminach meczów, zmianach w składzie i komunikatach od organizatora.",
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <div className="awp-page awp-page--narrow">
      <PitchPageHero
        title="Często zadawane pytania"
        subtitle="Znajdź odpowiedzi na najczęstsze pytania dotyczące akademii, zapisów, płatności i aplikacji."
      />

      <div className="mt-8 space-y-6">
        {faqCategories.map((cat) => (
          <PitchCard key={cat.category} className="text-left" contentClassName="p-6 sm:p-8">
            <span className={pitchLabelClass}>{cat.category}</span>
            <div className="mt-4 divide-y divide-emerald-800/40">
              {cat.items.map((item, i) => (
                <div key={i} className="py-4 first:pt-0 last:pb-0">
                  <h2 className="flex items-start gap-2 font-semibold text-white">
                    <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
                    {item.q}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-emerald-100/85 pl-6">{item.a}</p>
                </div>
              ))}
            </div>
          </PitchCard>
        ))}
      </div>

      <PitchCard className="mt-6 text-center" contentClassName="p-6 sm:p-8">
        <p className="text-sm text-emerald-100/90">
          Nie znalazłeś odpowiedzi na swoje pytanie?
        </p>
        <p className="mt-1 text-sm text-emerald-100/70">
          Skontaktuj się bezpośrednio z organizatorami akademii — chętnie pomożemy!
        </p>
        <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/kontakt"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-400"
          >
            Przejdź do kontaktu
          </Link>
          <Link
            href="/o-nas"
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 px-6 py-2.5 text-sm font-semibold text-emerald-300 transition hover:border-emerald-400 hover:text-emerald-200"
          >
            Dowiedz się więcej o akademii
          </Link>
        </div>
      </PitchCard>

      <p className="mt-8 text-center">
        <Link href="/" className="pitch-link text-sm">
          ← Strona główna
        </Link>
      </p>
    </div>
  );
}
