const DEV_FALLBACK = "development-secret-min-32-characters-long-key";

/** Klucz HS256 dla JWT — w produkcji wymagany AUTH_SECRET (min. 32 znaki). */
export function getAuthSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET?.trim();
  if (process.env.NODE_ENV === "production") {
    if (!secret || secret.length < 32) {
      throw new Error("AUTH_SECRET musi być ustawione w produkcji i mieć co najmniej 32 znaki.");
    }
    return new TextEncoder().encode(secret);
  }
  return new TextEncoder().encode(secret && secret.length >= 32 ? secret : DEV_FALLBACK);
}
