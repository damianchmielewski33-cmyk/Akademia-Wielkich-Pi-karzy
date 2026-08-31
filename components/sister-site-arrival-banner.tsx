"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Dumbbell, X } from "lucide-react";
import { GYMBRAT_SITE_NAME, getGymBratCrossLink } from "@/lib/sister-sites";
import { isInstalledAndroidAppClient, openExternalAppUrl } from "@/lib/app-webview";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "awp-sister-from-gymbrat-dismissed";

/**
 * Pasek powitalny, gdy użytkownik przyszedł z GymBrat (?from=gymbrat).
 * Pokazuje też stały skrót do GymBrat w stopce / na starcie osobno.
 */
export function SisterSiteArrivalBanner({ className }: { className?: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const from = searchParams.get("from");
    if (from !== "gymbrat") return;
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      /* ignore */
    }
    setVisible(true);
  }, [searchParams]);

  function dismiss() {
    setVisible(false);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    const params = new URLSearchParams(searchParams.toString());
    params.delete("from");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  if (!visible) return null;

  return (
    <div
      className={cn(
        "relative z-30 border-b border-rose-400/30 bg-gradient-to-r from-rose-950/90 via-zinc-950/90 to-emerald-950/80 px-3 py-2.5 text-sm text-rose-50",
        className
      )}
      role="status"
    >
      <div className="mx-auto flex max-w-6xl items-start gap-3 sm:items-center">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/20 ring-1 ring-rose-400/40">
          <Dumbbell className="h-4 w-4 text-rose-200" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-white">Cześć z {GYMBRAT_SITE_NAME}!</p>
          <p className="mt-0.5 text-xs text-rose-100/85 sm:text-sm">
            Jesteś w Akademii Wielkich Piłkarzy — terminarzu i statystykach z boiska. Wróć do siłowni kiedy chcesz.
          </p>
          <a
            href={getGymBratCrossLink("/")}
            className="mt-1.5 inline-flex text-xs font-semibold text-rose-200 underline-offset-2 hover:underline"
            {...(isInstalledAndroidAppClient()
              ? {
                  onClick: (e: React.MouseEvent) => {
                    e.preventDefault();
                    openExternalAppUrl(getGymBratCrossLink("/"));
                  },
                }
              : { target: "_blank", rel: "noopener noreferrer" })}
          >
            Otwórz {GYMBRAT_SITE_NAME} →
          </a>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="awp-focus-ring rounded-lg p-1.5 text-rose-100/70 hover:bg-white/10 hover:text-white"
          aria-label="Zamknij"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
