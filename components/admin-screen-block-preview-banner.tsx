import Link from "next/link";
import { Construction, Eye } from "lucide-react";

type Props = {
  screenTitle: string;
  settingsHref?: string;
  /** Podgląd widoku gracza (?preview_blocked=1) vs. zwykły admin na żywej stronie. */
  mode?: "live-admin" | "as-player";
  blocked?: boolean;
};

export function AdminScreenBlockPreviewBanner({
  screenTitle,
  settingsHref = "/panel-admina?tab=screen-blocks",
  mode = "live-admin",
  blocked = true,
}: Props) {
  if (mode === "as-player") {
    return (
      <div
        className="border-b border-sky-400/40 bg-sky-950/90 px-4 py-3 text-center text-sm text-sky-50"
        role="status"
      >
        <Eye className="mr-1.5 inline h-4 w-4 align-text-bottom text-sky-300" aria-hidden />
        <strong>Podgląd zaślepki</strong> — oglądasz ekran „{screenTitle}” tak jak gracz.
        {blocked ? (
          <> Poniżej powinna być zaślepka z Twoim komunikatem.</>
        ) : (
          <>
            {" "}
            <strong className="text-amber-200">Zaślepka nie jest teraz aktywna</strong> (harmonogram lub wyłączony
            przełącznik) — gracz widzi normalną treść.
          </>
        )}{" "}
        <Link href={settingsHref} className="font-semibold underline decoration-sky-300/50 underline-offset-2">
          Wróć do ustawień zaślepek
        </Link>
      </div>
    );
  }

  return (
    <div
      className="border-b border-amber-400/40 bg-amber-950/80 px-4 py-2.5 text-center text-sm text-amber-50"
      role="status"
    >
      <Construction className="mr-1.5 inline h-4 w-4 align-text-bottom text-amber-300" aria-hidden />
      <strong>{screenTitle}</strong> jest wyłączony dla graczy — Ty widzisz pełną treść (podgląd administratora).{" "}
      <Link href={settingsHref} className="font-semibold underline decoration-amber-300/50 underline-offset-2">
        Zarządzaj zaślepkami
      </Link>
    </div>
  );
}
