const DEV_FALLBACK = "development-secret-min-32-characters-long-key";

/**
 * Odczyt przez Reflect — na Vercelu przy `next build` zwykłe `process.env.AUTH_SECRET`
 * bywa wstrzykiwane w bundel jako `undefined`, jeśli zmienna nie była dostępna w czasie builda.
 * Runtime nadal ma poprawną wartość; Reflect.get zwykle omija ten inlining.
 */
function readAuthSecretFromEnv(): string | undefined {
  const raw = Reflect.get(process.env, "AUTH_SECRET");
  if (typeof raw !== "string") return undefined;
  return raw.trim();
}

/** Klucz HS256 dla JWT — w produkcji wymagany AUTH_SECRET (min. 32 znaki). */
export function getAuthSecretKey(): Uint8Array {
  const secret = readAuthSecretFromEnv();
  if (process.env.NODE_ENV === "production") {
    if (!secret || secret.length < 32) {
      const hint = secret ? `${secret.length} znaków (wymagane ≥32)` : "brak wartości w runtime";
      throw new Error(
        `AUTH_SECRET musi być ustawione w produkcji i mieć co najmniej 32 znaki (${hint}). Ustaw zmienną w Vercelu dla środowiska Production i wykonaj ponowny deploy.`
      );
    }
    return new TextEncoder().encode(secret);
  }
  return new TextEncoder().encode(secret && secret.length >= 32 ? secret : DEV_FALLBACK);
}
