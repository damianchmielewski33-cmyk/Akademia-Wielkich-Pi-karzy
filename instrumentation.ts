/** Weryfikacja konfiguracji przy starcie procesu Node (produkcja). */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV !== "production") return;
  const { getAuthSecretKey } = await import("./lib/auth-secret");
  getAuthSecretKey();
}
