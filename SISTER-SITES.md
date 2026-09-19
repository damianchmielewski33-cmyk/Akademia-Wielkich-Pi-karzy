# AWP ↔ GymBrat (osobne aplikacje)

Akademia Wielkich Piłkarzy i GymBrat to **dwa niezależne projekty** (osobny kod, osobny git, osobny deploy).

| Aplikacja | Repo / katalog | Dev | Produkcja |
|-----------|----------------|-----|-----------|
| **AWP** | to repozytorium | `npm run dev` → http://localhost:3000 | akademia-wielkich-pilkarzy.vercel.app |
| **GymBrat** | osobny projekt (np. `D:\GymBrat`) | `npm run dev` w katalogu GymBrat → :3001 | gym-brat.vercel.app |

## Wspólne konto

Jedno konto gracza = **te same imię, nazwisko i PIN** w obu aplikacjach.

- GymBrat weryfikuje PIN przez `POST {AWP}/api/auth/login`.
- Most SSO w GymBrat: `POST {GYMBRAT}/api/auth/awp-bridge` z body `{ "token": "<Bearer JWT Akademii>" }` (walidacja przez `GET {AWP}/api/auth/me`).

## Komunikacja

- Cross-linki i stałe: `lib/sister-sites.ts` (w każdej aplikacji **osobna kopia** — zmieniaj świadomie po obu stronach, jeśli trzeba).
- Embed GymBrat w AWP: ścieżka `/gymbrat` (iframe na URL z `NEXT_PUBLIC_GYMBRAT_URL`).
- Env AWP: `NEXT_PUBLIC_GYMBRAT_URL`, opcjonalnie `NEXT_PUBLIC_AWP_URL`, `NEXT_PUBLIC_AWP_EMBED_ORIGINS`, `NEXT_PUBLIC_GYMBRAT_TRUSTED_ORIGINS`.
- Env GymBrat: `NEXT_PUBLIC_AWP_URL`, CSP `frame-ancestors` pod origin AWP.

### SSO przy otwarciu `/gymbrat` (AWP → GymBrat)

1. **postMessage (preferowane w iframe):** GymBrat wysyła `{ type: "gymbrat-request-awp-session" }`. Shell AWP (`components/gymbrat-embed-view.tsx`) sprawdza `event.origin` (`isTrustedGymBratOrigin` / `NEXT_PUBLIC_GYMBRAT_URL` + localhost:3001 + podglądy Vercel) i — jeśli jest sesja AWP — odpowiada `{ type: "awp-session", token: "<jwt>" }` **tylko** do zaufanego originu. Bez sesji AWP nic nie wysyła (GymBrat pokazuje formularz imię/nazwisko/PIN).
2. **Awaryjnie URL:** przy zalogowanym użytkowniku `getGymBratCrossLink` dokleja `awp_token=<jwt>` oraz `from=awp`. Token to zwykły JWT sesji (ważność jak cookie); **nie logować** go do konsoli.
3. **WebView / APK (top-level):** postMessage z parentem nie działa — wymagany `awp_token` w URL (shell AWP przy `isRunningInAppWebView()` oraz natywny `SisterSites.gymBratCrossLink(..., token)`).

Zmiany w tym repozytorium **nie** powinny dotyczyć kodu GymBrat.
