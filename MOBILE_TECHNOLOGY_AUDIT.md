# Mobile Technology Audit

## Executive Decision

Docelowo najlepszym kierunkiem dla jednej aplikacji Android+iOS jest React Native z Expo. Repo jest juz oparte o React, TypeScript i Next.js, wiec Expo daje najmniejszy koszt wejscia w aplikacje cross-platform bez przepisywania zespolu na Dart ani utrzymywania dwoch osobnych aplikacji natywnych.

Nie warto jednak zatrzymywac obecnej aplikacji Android ani przepisywac jej natychmiast. Aktualny Android w Kotlin + Jetpack Compose ma juz natywne logowanie, biometrie, terminarz, zapisy, portfel, sklady, statystyki, rankingi, profil, push i aktualizacje APK. Najszybszy etap poprawy wygladu i funkcjonalnosci powinien zostac wykonany w obecnej aplikacji Compose, a Expo powinno wejsc jako kontrolowany PoC i ewentualna migracja ekran po ekranie.

## Current Stack

- Web: Next.js, React 19, TypeScript, Tailwind, API routes in `app/api`.
- Android: Kotlin, Jetpack Compose, Material 3, Retrofit, Moshi, DataStore, Biometric, Firebase/push-related integration.
- Hybrid bridge: Android uses native screens for core flows and `WebPortalScreen` for selected web-only flows through an app bridge.
- PWA baseline: the web app already has `app/manifest.ts`, responsive shell and Android APK download path.

## Android UX And Functionality Audit

### What Is Already Strong

- Core player flows are native: login, home, schedule, signup actions, wallet, profile, lineups, stats and rankings.
- Native-only value already exists: biometrics, push registration, APK update gate, stored session, bottom navigation and Android-specific API logging.
- The visual language is consistent with the site: pitch cards, Mundial colors, gold accents, Teko-like display typography and dark pitch background.
- `MainScaffold` already separates native routes from web portal routes, so the app can evolve screen by screen without a full rewrite.

### Main Issues To Fix First

- Schedule is overloaded. `ScheduleScreen` mixes list, calendar, player actions, admin match management, transport chat, stats input, add-match form and roster dialogs in one large screen.
- Some high-value flows still fall back to WebView: registration, forgot PIN, full profile editing, web payments, contact/admin communication, gallery, PZU Cup and panel admina.
- Several screens are mostly data dumps rather than mobile-first views. Stats, rankings, wallet history and lineups work, but they need clearer hierarchy, empty states, summary cards and fewer long vertical text lists.
- Admin features are squeezed into modal dialogs. This is acceptable as a temporary Android implementation, but not ideal as the long-term mobile UX.
- Error and action feedback is inconsistent across screens. Some flows show inline text, some cards, some silent catches.
- There is no shared TypeScript/Kotlin contract generator. Android DTOs mirror API responses manually, which increases migration and maintenance cost.

## Native Scope Decision

### Keep Or Make Native

These should be native in the mobile app because they are frequent, interactive or benefit from platform behavior:

- Login, remembered session and biometrics.
- Home dashboard with next match, quick actions and latest status.
- Schedule, signup, unsubscribe, match roster and match details.
- Transport preferences and match transport chat.
- Wallet balance, deposit declaration and payment history.
- Profile summary, push preferences, update checks and logout.
- Stats entry after match and personal stats overview.
- Lineups and rankings.
- Critical admin match operations used on the pitch: add/edit match, guests, signups, attendance, cancellation and settlement.

### Accept WebView Temporarily

These can stay in WebView during the improvement phase because they are less frequent or content-heavy:

- Gallery.
- O nas.
- Kontakt, until a native message composer exists.
- PZU Cup, unless it becomes a core mobile product.
- Full admin panel, except match-day actions.
- Full profile edit with photo upload, until native upload is implemented.
- Registration and forgot PIN, unless onboarding becomes a priority.

### Remove From WebView First

The first WebView reductions should be:

1. Registration and forgot PIN, because they affect first-time users.
2. Profile edit basics, because users expect account settings to stay inside the app.
3. Transport chat, because it is match-day critical and already has API coverage in Android.
4. Contact/admin messages, because it is a simple mobile-native communication flow.

## React Native + Expo PoC Scope

The PoC should answer whether Expo can replace the Android Compose app for both Android and iOS without losing native app quality.

### Screens

- Login with PIN and persisted token.
- Home dashboard with next match and quick actions.
- Schedule list with signup actions.
- Match details with roster and transport entry point.

### Technical Checks

- API client using the same Next.js endpoints.
- Auth token storage through SecureStore.
- Push notification feasibility through Expo Notifications or a dev-client path if Firebase is required.
- Deep links for invite links and app-bridge-style navigation.
- File/image upload feasibility for later profile photo support.
- Design token mapping from web/Compose colors into a React Native theme.
- Android APK and iOS build path through EAS Build.

### Success Criteria

- The PoC can log in, persist a session and perform signup actions against the existing API.
- UI matches the pitch/Mundial identity closely enough without large custom native work.
- Android and iOS builds can be produced from one codebase.
- Push and secure storage have a clear production path.
- The code is easier to share with the existing React/TypeScript stack than continuing separate native implementations.

## Migration Recommendation

Use a two-track approach:

1. Improve the existing Android Compose app now.
2. Build a small Expo PoC before committing to full migration.

If the Expo PoC succeeds, start migrating by product area:

1. Auth and app shell.
2. Home and schedule.
3. Signup, roster, transport.
4. Wallet and profile.
5. Stats, rankings and lineups.
6. Admin match-day tools.
7. Remaining content and admin flows.

If the Expo PoC fails on push, app build, auth storage, performance or UX quality, keep Compose for Android and plan a separate iOS strategy later.

## Recommended Immediate Android Improvements

- Split `ScheduleScreen` into smaller composables or feature files: toolbar, list, calendar, admin dialog, transport dialog and stats dialog.
- Make schedule the highest-polish screen: cleaner match cards, fewer horizontal chip rows, better primary actions and clearer status labels.
- Standardize feedback states: success, error, loading and empty states should use the same components across screens.
- Improve stats and rankings with compact summary cards and visual ranking rows instead of plain text-only cards.
- Improve wallet history with transaction grouping and clearer pending/confirmed states.
- Move registration and forgot PIN into native screens before less-used content pages.
- Add a single mobile design token source for colors, spacing, radius and typography names so Compose and future Expo can stay visually aligned.

## Final Recommendation

Do not switch technology just to improve the current Android look. Jetpack Compose is already capable of the desired visual quality.

Do switch technology if the product goal is truly Android+iOS from one codebase. In that case, use React Native + Expo as the target, but only after a small PoC proves auth, push, build and UX quality.
