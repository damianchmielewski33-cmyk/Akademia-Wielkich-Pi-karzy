# Produkcja tymczasowa: Render Free

AWP na **Render Web Service** (Node / Next.js), analogicznie do GymBrat (`https://gymbrat.onrender.com/`).
To zastępstwo, gdy Vercel Hobby / inny host jest niedostępny — **nie** VPS/Docker.

Sugerowana nazwa serwisu: `akademia-wielkich-pilkarzy` →  
`https://akademia-wielkich-pilkarzy.onrender.com`  
(potwierdź w dashboardzie Render; ustaw ten sam origin w env).

## Web Service

| Pole | Wartość |
|------|---------|
| Runtime | Node |
| Build | `npm install && npm run build` |
| Start | `npm start` (`next start` — nasłuchuje `PORT`) |
| Plan | Free (sen ~15 min bez ruchu — OK) |

## Env (dashboard Render)

Ustaw **bez trailing slash** (albo zgodnie z konwencją poniżej):

| Zmienna | Uwagi |
|---------|--------|
| `NEXT_PUBLIC_SITE_URL` | `https://<serwis>.onrender.com` |
| `NEXT_PUBLIC_APP_URL` | ten sam origin |
| `AUTH_SECRET` | ≥ 32 znaki |
| `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` | baza produkcyjna |
| `CRON_SECRET` | cleanup |
| `SMTP_*` / `EMAIL_FROM` | kody e-mail (rejestracja / reset) |
| `BLOB_READ_WRITE_TOKEN` | uploady (jeśli używasz Vercel Blob także z Rendera) |
| `HOTPAY_*` | płatności |
| `NEXT_PUBLIC_GYMBRAT_URL` | np. `https://gymbrat.onrender.com` |
| `CSRF_ALLOWED_ORIGINS` | opcjonalnie CSV dodatkowych originów |
| `RENDER_EXTERNAL_URL` | **ustawia Render automatycznie** — CSRF / Origin |
| `RENDER_API_KEY` / `RENDER_SERVICE_ID` / `RENDER_BANDWIDTH_LIMIT_GB` | opcjonalny monitoring (Free ≈ 5 GB/mies.) |

Nie commituj `.env` / sekretów.

## CSRF / Origin

Na Renderze wewnętrzny `req.url` bywa `localhost`, a przeglądarka wysyła Origin `*.onrender.com`.
`lib/csrf.ts` porównuje Origin z **Host / X-Forwarded-Host / X-Forwarded-Proto** oraz allowlistą
(`NEXT_PUBLIC_*`, `RENDER_EXTERNAL_URL`, `CSRF_ALLOWED_ORIGINS`).

Cookie `awp_xsrf` ustawia `GET /api/csrf` (bootstrap w layoucie).  
`assertCsrf()` + `getXsrfHeaders()` — włączaj przy chronionych mutacjach; analytics używa `assertAnalyticsOrigin`.

## Auth

AWP używa własnej sesji JWT (PIN / e-mail), **nie** NextAuth OAuth Google/Facebook.
Cookies: `Secure` + `SameSite=Lax` w produkcji (HTTPS na Renderze).

## Cron

Vercel Cron z `vercel.json` **nie** działa na Renderze.

1. Render → Cron Job (codziennie), **albo**
2. zewnętrzny ping:

```http
GET https://<serwis>.onrender.com/api/cron/database-cleanup
Authorization: Bearer <CRON_SECRET>
```

## Realtime

Brak SSE — czat / odznaki to krótki HTTP poll (`lib/realtime-poll-config.ts`: 12–60 s).
Nie dodawaj pollingu co 1 s w tle (Active CPU + sen Free).

## Android / WebView

Źródła APK **nie są** w tym repo (folder `android/` lokalny / nieśledzony).
Po przywróceniu źródeł:

- `API_BASE_URL=https://<serwis>.onrender.com/`
- allowlista hostów WebView: `*.onrender.com`
- CI secret `ANDROID_API_BASE_URL` jeśli używany

Do tego czasu APK wskazuje poprzedni origin — przebuduj po cutoverze.

## Sen Free

Pierwsze wejście po ~15 min bezruchu może pokazać ekran „waking up” (kilkadziesiąt sekund).
To oczekiwane na Free — nie obiecuj „brak snu”.

## Awaria: utracony `PIN_PEPPER`

Starych PIN-ów nie da się odzyskać. Reset hashy w Turso:

1. Na Renderze **usuń** `PIN_PEPPER` (albo ustaw nowy **znany**).
2. Dodaj tymczasowo:
   - `ENABLE_EMERGENCY_PIN_RESET=1`
   - `EMERGENCY_PIN_RESET_SECRET=` (min. 24 losowe znaki)
3. Redeploy, potem (PowerShell):

```powershell
$secret = "WklejTenSamSecret"
$pin = "482917"   # 4–6 cyfr, nie 1234
Invoke-RestMethod -Method POST `
  -Uri "https://akademia-wielkich-pilkarzy.onrender.com/api/cron/emergency-pin-reset" `
  -Headers @{ Authorization = "Bearer $secret"; "Content-Type" = "application/json" } `
  -Body (@{ temp_pin = $pin; scope = "all" } | ConvertTo-Json)
```

`scope`: `"admins"` (domyślnie) albo `"all"` (wszyscy gracze).

4. Zaloguj się **imię + nazwisko + tymczasowy PIN**.
5. **Usuń** `ENABLE_EMERGENCY_PIN_RESET` i `EMERGENCY_PIN_RESET_SECRET`, redeploy.
6. Każdy zmienia PIN na własny w aplikacji.

Alternatywa lokalna: `CONFIRM=YES EMERGENCY_TEMP_PIN=482917 SCOPE=all npm run db:emergency-reset-pins` (z Turso w `.env.local`).

## Smoke po deployu

1. Otwórz publiczny URL (poczekaj na wake-up).
2. Logowanie PIN / e-mail.
3. Jedna mutacja (np. zapis profilu / zapisanie się na mecz) — brak 403 Origin.
4. Analytics: odśwież stronę (brak 403 na `/api/analytics/page-view`).
5. Opcjonalnie: ręczny GET cleanup z `CRON_SECRET`.
