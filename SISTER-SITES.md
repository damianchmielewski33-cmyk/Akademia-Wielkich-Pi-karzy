# AWP ↔ GymBrat (osobne aplikacje)

Akademia Wielkich Piłkarzy i GymBrat to **dwa niezależne projekty** (osobny kod, osobny git, osobny deploy).

| Aplikacja | Repo / katalog | Dev | Produkcja |
|-----------|----------------|-----|-----------|
| **AWP** | to repozytorium | `npm run dev` → http://localhost:3000 | akademia-wielkich-pilkarzy.vercel.app |
| **GymBrat** | osobny projekt (np. `D:\GymBrat`) | `npm run dev` w katalogu GymBrat → :3001 | gym-brat.vercel.app |

## Komunikacja

- Cross-linki i stałe: `lib/sister-sites.ts` (w każdej aplikacji **osobna kopia** — zmieniaj świadomie po obu stronach, jeśli trzeba).
- Embed GymBrat w AWP: ścieżka `/gymbrat` (iframe na URL z `NEXT_PUBLIC_GYMBRAT_URL`).
- Env AWP: `NEXT_PUBLIC_GYMBRAT_URL`, opcjonalnie `NEXT_PUBLIC_AWP_URL`, `NEXT_PUBLIC_AWP_EMBED_ORIGINS`.
- Env GymBrat: `NEXT_PUBLIC_AWP_URL`, CSP `frame-ancestors` pod origin AWP.

Zmiany w tym repozytorium **nie** powinny dotyczyć kodu GymBrat.
