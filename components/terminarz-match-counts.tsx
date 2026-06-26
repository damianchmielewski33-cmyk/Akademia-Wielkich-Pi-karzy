import type { PlayersDataEntry } from "@/lib/terminarz-shared";
import { formatPonderingPlayersPolish, tentativeSignupCount } from "@/lib/terminarz-shared";

export function MatchSignupCountsBlock({
  matchId,
  signedUp,
  maxSlots,
  playersData,
  variant = "card",
  tone = "emerald",
}: {
  matchId: number;
  signedUp: number;
  maxSlots: number;
  playersData: Record<number, PlayersDataEntry>;
  variant?: "card" | "table";
  tone?: "emerald" | "zinc";
}) {
  const tentative = tentativeSignupCount(playersData, matchId);
  const pondering = formatPonderingPlayersPolish(tentative);
  const mainCls =
    tone === "zinc"
      ? variant === "table"
        ? "font-bold text-white"
        : "text-sm font-semibold text-white"
      : variant === "table"
        ? "font-bold text-emerald-950 dark:text-emerald-100"
        : "text-sm font-semibold text-emerald-950 dark:text-emerald-100";
  const subCls =
    tone === "zinc"
      ? variant === "table"
        ? "mt-0.5 text-[11px] font-medium leading-snug text-white/75"
        : "mt-0.5 text-xs font-medium text-white/75"
      : variant === "table"
        ? "mt-0.5 text-[11px] font-medium leading-snug text-emerald-800 dark:text-emerald-300"
        : "mt-0.5 text-xs font-medium text-emerald-800/90 dark:text-emerald-300/90";
  return (
    <div>
      <p className={mainCls}>
        {signedUp}/{maxSlots} zapisanych
      </p>
      {pondering ? <p className={subCls}>{pondering}</p> : null}
    </div>
  );
}
