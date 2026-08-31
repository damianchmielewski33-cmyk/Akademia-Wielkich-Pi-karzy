# Monorepo: Akademia + GymBrat

Jeden repozytorium, dwie aplikacje Next.js:

| Aplikacja | Katalog | Dev | Produkcja |
|-----------|---------|-----|-----------|
| **Akademia Wielkich Piłkarzy** | `/` (root) | `npm run dev` → http://localhost:3000 | akademia-wielkich-pilkarzy.vercel.app |
| **GymBrat** | `/gymbrat` | `npm run dev:gymbrat` → http://localhost:3001 | gym-brat.vercel.app |

## Wspólny kod

- `packages/sister-sites` — linki i stałe między aplikacjami (`@awp/sister-sites`)
- W obu aplikacjach `lib/sister-sites.ts` tylko re-eksportuje z tego pakietu

## Edycja GymBrat w Cursorze

Otwórz ten projekt (root Akademii). Kod GymBrat jest w folderze **`gymbrat/`** — edytujesz go jak każdy inny plik w repo.

Stary folder na pulpicie `Pulpit/GymBrat` możesz zostawić jako kopię zapasową albo usunąć po zsynchronizowaniu zmian do `gymbrat/`.

## Instalacja

```bash
# Akademia (root)
npm install

# GymBrat — osobno, w swoim folderze (nie łączy się z node_modules w root)
cd gymbrat && npm install
```

Dzięki temu nie instalujesz dwóch pełnych zestawów zależności Next.js na raz (oszczędność miejsca na dysku).

## Vercel

- **AWP:** Root Directory = `.` (domyślnie)
- **GymBrat:** Root Directory = `gymbrat` (ustaw w projekcie Vercel GymBrat)

Oba projekty mogą wskazywać na to samo repozytorium GitHub.

## Migracja ze starego GymBrat

Jeśli masz niezacommitowane zmiany w `Pulpit/GymBrat`, skopiuj je ręcznie do `gymbrat/` lub użyj diffa. Monorepo zostało zainicjowane kopią z tamtego folderu.
