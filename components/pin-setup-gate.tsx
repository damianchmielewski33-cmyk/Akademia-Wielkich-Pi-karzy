import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";

function normalizePath(pathname: string): string {
  if (!pathname) return "/";
  const p = pathname.split("?")[0] ?? pathname;
  if (p.length > 1 && p.endsWith("/")) return p.slice(0, -1);
  return p || "/";
}

/**
 * Użytkownik z ważną sesją, ale bez pin_hash w bazie, może korzystać tylko z wybranych ścieżek
 * do ustawienia PIN-u lub wylogowania.
 */
const ALLOWED_WHEN_PIN_PENDING = new Set(["/ustaw-pin", "/login", "/register"]);

export async function PinSetupGate({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session?.needsPinSetup) return <>{children}</>;

  const h = await headers();
  const pathname = normalizePath(h.get("x-pathname") ?? "");
  if (ALLOWED_WHEN_PIN_PENDING.has(pathname)) return <>{children}</>;

  redirect("/ustaw-pin");
}
