/** Weryfikacja konfiguracji przy starcie procesu Node (produkcja). */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV !== "production") return;
  const { getAuthSecretKey } = await import("./lib/auth-secret");
  getAuthSecretKey();
  /** Zapewnia tabele w Turso zanim trafi pierwsze żądanie (bez importu lib/db — unika better-sqlite3 w bundlu). */
  if (process.env.TURSO_DATABASE_URL?.trim()) {
    const { createClient } = await import("@libsql/client");
    const { initLibsqlSchema } = await import("./lib/turso-init-schema");
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN?.trim() || undefined,
    });
    try {
      await initLibsqlSchema(client);
    } finally {
      client.close();
    }
  }
}
