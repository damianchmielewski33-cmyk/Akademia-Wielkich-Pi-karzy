/** Weryfikacja konfiguracji przy starcie procesu Node (produkcja). */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV !== "production") return;
  const { getAuthSecretKey } = await import("./lib/auth-secret");
  getAuthSecretKey();
  if (!process.env.PIN_PEPPER?.trim()) {
    console.warn(
      "[security] PIN_PEPPER nie jest ustawione w produkcji — rozważ dodanie losowego sekretu (≥16 znaków) dla lepszej ochrony PIN-ów."
    );
  }
  /** Zapewnia tabele w Turso zanim trafi pierwsze żądanie (bez importu lib/db — unika better-sqlite3 w bundlu). */
  const tursoUrl = process.env.TURSO_DATABASE_URL?.trim();
  if (tursoUrl) {
    const { createClient } = await import("@libsql/client");
    const { initLibsqlSchema } = await import("./lib/turso-init-schema");
    const { withTransientNetworkRetries } = await import("./lib/transient-network-retry");
    await withTransientNetworkRetries(async () => {
      const client = createClient({
        url: tursoUrl,
        authToken: process.env.TURSO_AUTH_TOKEN?.trim() || undefined,
      });
      try {
        await initLibsqlSchema(client);
      } finally {
        client.close();
      }
    });
  }
}
