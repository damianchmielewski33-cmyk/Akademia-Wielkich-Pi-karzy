const DEV_FALLBACK = "development-secret-min-32-characters-long-key";

/**
 * Odczyt sekretu w runtime (Vercel / Next).
 * Bundler potrafi wstrzyknąć `process.env.AUTH_SECRET` z momentu `next build` jako `undefined`;
 * dynamiczna nazwa klucza (`AUTH` + `_` + `SECRET`) omija typowy inlining i czyta wartość z platformy.
 * Działa też w Edge (middleware) — bez `node:process`.
 */
function readAuthSecretFromEnv(): string | undefined {
  const key = ["AUTH", "_", "SECRET"].join("");
  const fromDynamic = process.env[key as keyof NodeJS.ProcessEnv];
  if (typeof fromDynamic === "string" && fromDynamic.trim()) {
    return fromDynamic.trim();
  }
  const fromReflect = Reflect.get(process.env, "AUTH_SECRET");
  if (typeof fromReflect === "string" && fromReflect.trim()) {
    return fromReflect.trim();
  }
  return undefined;
}

function isNodeProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/** Klucz HS256 dla JWT — w produkcji wymagany AUTH_SECRET (min. 32 znaki). */
export function getAuthSecretKey(): Uint8Array {
  const secret = readAuthSecretFromEnv();
  if (isNodeProduction()) {
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
