"use client";

import { Users } from "lucide-react";
import type { PlayerEntry, PlayersDataEntry } from "@/lib/terminarz-shared";
import { PlayerAvatar, PlayerNameStack } from "@/components/player-avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  entry: PlayersDataEntry | null;
  /** Maks. wierszy potwierdzonych zapisów (reszta → „i X innych”). */
  maxVisible?: number;
  onViewAll?: () => void;
  className?: string;
};

export function MatchSignupRosterPreview({
  entry,
  maxVisible = 6,
  onViewAll,
  className,
}: Props) {
  const confirmed = entry?.players ?? [];
  const tentative = entry?.tentativePlayers ?? [];
  const visible = confirmed.slice(0, maxVisible);
  const hiddenCount = Math.max(0, confirmed.length - visible.length);

  if (confirmed.length === 0 && tentative.length === 0) {
    return (
      <p className={cn("mt-3 text-center text-xs font-medium normal-case tracking-normal text-white/75", className)}>
        Jeszcze nikt się nie zapisał — bądź pierwszy.
      </p>
    );
  }

  return (
    <div className={cn("mt-3 space-y-3", className)}>
      {confirmed.length > 0 ? (
        <ul className="space-y-1.5" aria-label="Zapisani na mecz">
          {visible.map((p) => (
            <li
              key={p.userId}
              className="flex items-center gap-2 rounded-lg bg-black/20 px-2 py-1.5 ring-1 ring-white/10"
            >
              <PlayerAvatar
                photoPath={p.profilePhotoPath}
                firstName={p.firstName}
                lastName={p.lastName}
                size="xs"
                ringClassName="ring-2 ring-white/35"
              />
              <div className="min-w-0 flex-1">
                <PlayerNameStack
                  firstName={p.firstName}
                  lastName={p.lastName}
                  nick={p.zawodnik}
                  primaryClassName="text-xs font-semibold text-white"
                  secondaryClassName="text-[10px] text-white/75"
                />
              </div>
            </li>
          ))}
          {hiddenCount > 0 ? (
            <li className="px-2 py-1 text-center text-xs font-medium normal-case tracking-normal text-white/80">
              i {hiddenCount} {hiddenCount === 1 ? "inna osoba" : hiddenCount < 5 ? "inne osoby" : "innych osób"}
            </li>
          ) : null}
        </ul>
      ) : null}

      {tentative.length > 0 ? (
        <TentativeHint players={tentative} />
      ) : null}

      {onViewAll ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 w-full gap-2 border border-white/20 bg-white/10 text-xs font-semibold text-white hover:bg-white/15 hover:text-white"
          onClick={onViewAll}
        >
          <Users className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Pełna lista zapisanych
        </Button>
      ) : null}
    </div>
  );
}

function TentativeHint({ players }: { players: PlayerEntry[] }) {
  const labels = players.slice(0, 3).map((p) => {
    const nick = p.zawodnik?.trim();
    if (nick) return nick;
    return `${p.firstName} ${p.lastName}`.trim() || "Zawodnik";
  });
  const rest = players.length - labels.length;
  const names = rest > 0 ? `${labels.join(", ")} i ${rest} innych` : labels.join(", ");
  return (
    <p className="text-center text-[11px] font-medium normal-case tracking-normal text-amber-100/95">
      {names} — jeszcze się zastanawia{players.length === 1 ? "" : "ją"}
    </p>
  );
}
