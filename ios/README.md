# AWP iOS

Aplikacja iOS jest **równorzędnym produktem** obok portalu WWW i Androida.

- Ten sam backend, API, logowanie, portfel, ranking, statystyki i powiadomienia.
- Ten sam Design System: `AwpDesignTokens.swift` ↔ `lib/design-system.ts` ↔ `android/.../theme/Color.kt`.
- UX nie jest kopią WWW ani Androida: duże CTA kciukiem, 4 taby, skrót admina.
- Makiety: `/makiety` (platforma iOS).

Natywny projekt SwiftUI powstaje na tych tokenach i na tym samym API co klient Android (`/api/...`).
