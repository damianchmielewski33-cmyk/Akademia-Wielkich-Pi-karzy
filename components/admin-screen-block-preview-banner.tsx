import Link from "next/link";
import { Construction } from "lucide-react";

type Props = {
  screenTitle: string;
  settingsHref?: string;
};

export function AdminScreenBlockPreviewBanner({
  screenTitle,
  settingsHref = "/panel-admina?tab=screen-blocks",
}: Props) {
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
