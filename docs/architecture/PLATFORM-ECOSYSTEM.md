# AWP — WWW + iOS + Android jako jeden ekosystem

System nie jest wyłącznie stroną internetową i nie jest wyłącznie aplikacją mobilną.

Trzy równorzędne produkty, projektowane równolegle:

1. Portal WWW
2. Aplikacja iOS
3. Aplikacja Android

Klikalne makiety i Design System: **`/makiety`**.

## Współdzielone

Backend, API, baza, logowanie, płatności, ranking, statystyki, powiadomienia.

Użytkownik ma czuć **jeden produkt**, niezależnie od urządzenia.

## Spójność wizualna

Wspólne: branding, logo, kolorystyka, ikony (ta sama metafora), typografia (Teko + sans), Design System.

Źródło tokenów: `lib/design-system.ts`.

## Spójność funkcjonalna

Każda funkcja biznesowa z WWW ma odpowiednik w iOS i Android (mecze, zapisy, obecność, płatności, portfel, rankingi, statystyki, rezerwacje, transmisje, galerie, profil). Żadna kluczowa funkcja nie jest tylko na jednej platformie.

Mapa: `lib/platform-ecosystem.ts`.

## Różnice UX

Interfejsy **nie są kopiami 1:1**.

| | WWW | Mobile |
|---|---|---|
| Rola | Centrum administracyjne, dashboardy, tabele, raporty, finanse, boiska | Zapis, płatność, profil, stats, obecność, ranking, live, push |
| Gęstość | Wyższa | Niższa |
| Priorytet | Analiza i zarządzanie | Szybkość, jedna ręka, mało kliknięć |

## Kryteria akceptacji

- WWW, iOS i Android są pełnoprawnymi produktami.
- Wspólny branding i wspólna logika biznesowa.
- Funkcje zgodne między platformami.
- WWW ma rozbudowaną administrację; mobile ma zoptymalizowany UX.
- Użytkownik przechodzi między urządzeniami bez uczenia się produktu od nowa.

Jakość referencyjna (nie kopiować funkcji): Airbnb, Booking, Revolut, Uber, Strava, SofaScore — przejrzystość, szybkość, prezentacja danych.
