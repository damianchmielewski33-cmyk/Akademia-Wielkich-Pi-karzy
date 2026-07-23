# Android Native Auth/Profile Scope

## Purpose

This is the next implementation slice after the first Android UX pass. The goal is to reduce WebView usage for onboarding and account management without destabilizing the current Compose app.

## Native Screens To Add

### Register

- Route/state from `LoginScreen`: open a native `RegisterScreen` instead of `WebPortalScreen("/register")`.
- Fields: first name, last name, player alias, PIN, PIN confirmation.
- Endpoint: `POST api/auth/register`.
- Request model: `RegisterRequest(first_name, last_name, zawodnik, pin, pin_confirm, auto_login = false, realm = "academy")`.
- Response model: `RegisterResponse(ok, logged_in, error, user)`.
- After success: show a status card and return to login with prefilled first/last name if practical.
- Do not rely on `auto_login` yet, because the current mobile session uses bearer tokens and this web endpoint primarily creates a cookie session.

### Forgot PIN

- Route/state from `LoginScreen`: open a native `ForgotPinScreen` instead of `WebPortalScreen("/login")`.
- Fields: first name, last name, player alias, new PIN, PIN confirmation.
- Endpoint: `POST api/auth/forgot-pin-request`.
- Request model: `ForgotPinRequest(first_name, last_name, zawodnik, pin, pin_confirm)`.
- Response model: existing `ApiOkResponse` is enough.
- After success: show an explanation that the new PIN waits for admin approval.

### Basic Profile Edit

- Entry point from `ProfileScreen`: replace "Edytuj profil" WebView button with native edit dialog for basic fields.
- Fields: first name, last name, player alias, UI theme.
- Endpoint: `PATCH api/profile`.
- Request model: `ProfilePatchRequest(first_name?, last_name?, zawodnik?, ui_theme?)`.
- Response model: extend `ProfileResponse` wrapper to read `ok` and `token`.
- After success: update stored session if a token is returned, then reload profile.
- Keep photo upload in WebView until a native file picker/upload flow is added.

## Files To Touch

- `android/app/src/main/java/pl/akademiawielkichpilkarzy/app/data/api/AwpApi.kt`
- `android/app/src/main/java/pl/akademiawielkichpilkarzy/app/data/api/Models.kt`
- `android/app/src/main/java/pl/akademiawielkichpilkarzy/app/ui/login/LoginScreen.kt`
- `android/app/src/main/java/pl/akademiawielkichpilkarzy/app/ui/profile/ProfileScreen.kt`
- Optional new files under `android/app/src/main/java/pl/akademiawielkichpilkarzy/app/ui/login/`

## Recommended Order

1. Add API models and Retrofit methods.
2. Add native forgot PIN, because it does not affect session state.
3. Add native register without auto-login.
4. Add basic profile edit with token/session refresh.
5. Keep WebView links as fallback labels until the native flows are verified on device.
