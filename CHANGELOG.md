# Changelog — Akademia Wielkich Piłkarzy

Format: wpisy od najnowszych. Daty po deployu uzupełniaj ręcznie.

## [Unreleased] — awaryjny reset PIN (utrata PIN_PEPPER)

- Endpoint `POST /api/cron/emergency-pin-reset` + skrypt `npm run db:emergency-reset-pins` — nowy hash tymczasowego PIN-u w Turso, gdy stary `PIN_PEPPER` jest nieodwracalnie utracony.

## [Unreleased] — migracja na Render Free (zapowiedź)

- Przygotowanie hostingu **Render Free** (Web Service) jako tymczasowej produkcji.
- CSRF / Origin: allowlista `RENDER_EXTERNAL_URL`, `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_APP_URL`, porównanie z `X-Forwarded-Host` (za proxy Render `req.url` bywa localhost).
- Dokumentacja: `docs/render-free.md`, sekcja Render w `.env.example` i README.
- Realtime: jawne interwały HTTP poll (`lib/realtime-poll-config.ts`) — bez SSE.
- Domyślne originy siostrzane: GymBrat → `https://gymbrat.onrender.com`, AWP → `*.onrender.com` (nadpisz env po utworzeniu serwisu).

### Po deployu

- [ ] Data cutoveru: _YYYY-MM-DD_
- [ ] Publiczny URL: `https://________________.onrender.com`
- [ ] Smoke: login, POST bez 403 Origin, cleanup cron
