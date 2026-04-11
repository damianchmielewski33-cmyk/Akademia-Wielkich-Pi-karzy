"use client";

import { Car, UserRound } from "lucide-react";
import type { TransportParticipantDTO } from "@/lib/transport";
import { PlayerAvatar, PlayerNameStack } from "@/components/player-avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Props = {
  drivers: TransportParticipantDTO[];
  riders: TransportParticipantDTO[];
  currentUserId: number;
};

function ParticipantRow({
  p,
  isSelf,
  accentClass,
}: {
  p: TransportParticipantDTO;
  isSelf: boolean;
  accentClass: string;
}) {
  return (
    <li
      className={cn(
        "flex items-center gap-3 border-b border-zinc-100/90 px-3 py-2.5 last:border-b-0",
        isSelf && accentClass
      )}
    >
      <PlayerAvatar
        photoPath={p.profilePhotoPath}
        firstName={p.firstName}
        lastName={p.lastName}
        size="sm"
        ringClassName="ring-2 ring-white/80"
      />
      <div className="min-w-0 flex-1 text-left">
        <PlayerNameStack firstName={p.firstName} lastName={p.lastName} nick={p.zawodnik} />
      </div>
      {isSelf && (
        <Badge variant="secondary" className="shrink-0 text-[10px] font-semibold uppercase tracking-wide">
          Ty
        </Badge>
      )}
    </li>
  );
}

export function TransportRosters({ drivers, riders, currentUserId }: Props) {
  return (
    <section className="space-y-4" aria-labelledby="transport-rosters-heading">
      <div>
        <h2 id="transport-rosters-heading" className="text-lg font-semibold text-emerald-950 dark:text-emerald-100">
          Kto z kim może jechać
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-zinc-600">
          <span className="font-medium text-emerald-900 dark:text-emerald-200">Zielona kolumna</span> — osoby z wolnymi
          miejscami w aucie i
          chęcią zabrania pasażerów. <span className="font-medium text-sky-900">Niebieska kolumna</span> — osoby, które
          jadą komunikacją i <strong>potrzebują dojazdu</strong> od kogoś z drużyny. Ustal szczegóły w czacie poniżej
          (jeśli masz dostęp).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div
          className="flex flex-col overflow-hidden rounded-2xl border-2 border-emerald-300/90 bg-gradient-to-b from-emerald-50/95 to-white shadow-sm ring-1 ring-emerald-900/10"
          role="region"
          aria-label="Kierowcy mogący zabrać pasażerów"
        >
          <div className="flex items-center gap-2 border-b border-emerald-200/90 bg-emerald-700/95 px-4 py-3 text-white">
            <Car className="h-5 w-5 shrink-0 opacity-95" aria-hidden />
            <div>
              <p className="text-sm font-bold leading-tight">Mogą zabrać pasażerów</p>
              <p className="text-[11px] font-medium text-emerald-100/95">Samochód — są miejsca w aucie</p>
            </div>
          </div>
          {drivers.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-zinc-500">
              Nikt jeszcze nie zgłosił wolnych miejsc. Jeśli możesz zabrać kogoś, zaktualizuj zapis na mecz (preferencje
              transportu).
            </p>
          ) : (
            <ul className="max-h-72 overflow-y-auto">
              {drivers.map((p) => (
                <ParticipantRow
                  key={p.userId}
                  p={p}
                  isSelf={p.userId === currentUserId}
                  accentClass="bg-emerald-50/80"
                />
              ))}
            </ul>
          )}
        </div>

        <div
          className="flex flex-col overflow-hidden rounded-2xl border-2 border-sky-300/90 bg-gradient-to-b from-sky-50/95 to-white shadow-sm ring-1 ring-sky-900/10"
          role="region"
          aria-label="Osoby potrzebujące transportu"
        >
          <div className="flex items-center gap-2 border-b border-sky-200/90 bg-sky-700/95 px-4 py-3 text-white">
            <UserRound className="h-5 w-5 shrink-0 opacity-95" aria-hidden />
            <div>
              <p className="text-sm font-bold leading-tight">Potrzebują transportu</p>
              <p className="text-[11px] font-medium text-sky-100/95">Komunikacja — szukają dojazdu z drużyną</p>
            </div>
          </div>
          {riders.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-zinc-500">
              Nikt nie zgłosił potrzeby dojazdu. Jeśli potrzebujesz podwózki, ustaw to przy zapisie lub w preferencjach
              transportu.
            </p>
          ) : (
            <ul className="max-h-72 overflow-y-auto">
              {riders.map((p) => (
                <ParticipantRow
                  key={p.userId}
                  p={p}
                  isSelf={p.userId === currentUserId}
                  accentClass="bg-sky-50/80"
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
