# Akademia Wielkich Piłkarzy (AWP)

Next.js (App Router) — terminarz, rezerwacje orlika/hali, portfel, rankingi.

## Lokalnie

```bash
npm install
npm run dev
```

Otwórz [http://localhost:3000](http://localhost:3000). Wymagany Node ≥ 20.9.

Skopiuj `.env.example` → `.env.local` i uzupełnij przynajmniej `AUTH_SECRET` (lokalnie może być dowolny ≥ 32 znaki).

## Produkcja tymczasowa: Render Free

Gdy Vercel Hobby / inny host jest niedostępny, AWP działa jak GymBrat na Renderze.

- Checklist i env: **[docs/render-free.md](docs/render-free.md)**
- Sugerowany URL: `https://akademia-wielkich-pilkarzy.onrender.com` (potwierdź w dashboardzie)
- Build: `npm install && npm run build` · Start: `npm start`
- Free **usypia** po ~15 min bez ruchu — pierwsze wejście może chwilę budzić serwis
- Cron Vercel (`vercel.json`) **nie** działa na Renderze — Cron Job / zewnętrzny ping z `CRON_SECRET`
- Auth: własna sesja JWT (PIN / e-mail) — brak OAuth Google/Facebook do dopisywania w konsolach
- CSRF: `lib/csrf.ts` + `RENDER_EXTERNAL_URL` / `X-Forwarded-*` (krytyczne za proxy Render)

## Siostrzana aplikacja

GymBrat: osobne repo. Cross-linki: `lib/sister-sites.ts`, env `NEXT_PUBLIC_GYMBRAT_URL`.  
Szczegóły: [SISTER-SITES.md](SISTER-SITES.md).

## Skrypty

| Skrypt | Opis |
|--------|------|
| `npm run dev` | serwer deweloperski |
| `npm run build` / `npm start` | produkcja |
| `npm test` | Vitest |
| `npm run db:init-turso` | schemat na pustej bazie Turso |

## Changelog

Zobacz [CHANGELOG.md](CHANGELOG.md).
