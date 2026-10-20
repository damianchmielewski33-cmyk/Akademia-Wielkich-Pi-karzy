# AWP ↔ GymBrat (osobne aplikacje)

Akademia Wielkich Piłkarzy i GymBrat to **dwa niezależne projekty** (osobny kod, osobny git, osobny deploy).

| Aplikacja | Repo / katalog | Dev | Produkcja (tymczasowo Render Free) |
|-----------|----------------|-----|-------------------------------------|
| **AWP** | to repozytorium | `npm run dev` → http://localhost:3000 | `https://akademia-wielkich-pilkarzy.onrender.com` (potwierdź w Render) |
| **GymBrat** | osobny projekt (np. `D:\GymBrat`) | `npm run dev` w katalogu GymBrat → :3001 | `https://gymbrat.onrender.com` |

Poprzednie originy Vercel (`*.vercel.app`) mogą wrócić po restarcie Hobby / innym hoście — nadpisuj env, nie hardcoduj na stałe w featureach.

## Komunikacja

- Cross-linki i stałe: `lib/sister-sites.ts` (w każdej aplikacji **osobna kopia** — zmieniaj świadomie po obu stronach, jeśli trzeba).
- Embed GymBrat w AWP: ścieżka `/gymbrat` (iframe na URL z `NEXT_PUBLIC_GYMBRAT_URL`).
- Env AWP: `NEXT_PUBLIC_GYMBRAT_URL`, opcjonalnie `NEXT_PUBLIC_AWP_URL`, `NEXT_PUBLIC_AWP_EMBED_ORIGINS`.
- Env GymBrat: `NEXT_PUBLIC_AWP_URL`, CSP `frame-ancestors` pod origin AWP (w tym `https://*.onrender.com`).

Zmiany w tym repozytorium **nie** powinny dotyczyć kodu GymBrat.

Deploy AWP na Render: [docs/render-free.md](docs/render-free.md).
