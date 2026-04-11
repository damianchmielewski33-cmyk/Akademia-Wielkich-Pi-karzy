"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import type { SignupTransportRow, TransportParticipantDTO } from "@/lib/transport";
import { MatchTransportSignupDialog } from "@/components/match-transport-signup-dialog";
import { TransportChatClient, type TransportMessageDTO } from "@/components/transport-chat-client";
import { TransportRosters } from "@/components/transport-rosters";
import { Button } from "@/components/ui/button";

type Props = {
  matchId: number;
  matchDate: string;
  matchTime: string;
  location: string;
  played: boolean;
  eligible: boolean;
  signup: SignupTransportRow;
  initialMessages: TransportMessageDTO[];
  currentUserId: number;
  canEditTransport: boolean;
  driversOffering: TransportParticipantDTO[];
  ridersNeeding: TransportParticipantDTO[];
};

export function TransportMatchClient({
  matchId,
  matchDate,
  matchTime,
  location,
  played,
  eligible,
  signup,
  initialMessages,
  currentUserId,
  canEditTransport,
  driversOffering,
  ridersNeeding,
}: Props) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="container mx-auto max-w-2xl flex-1 px-4 py-8 sm:py-10">
      <div className="mb-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800/75">Transport</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-emerald-950 dark:text-emerald-100 sm:text-3xl">Transport na mecz</h1>
        <p className="mt-2 text-sm text-zinc-600">
          {matchDate} · {matchTime}
        </p>
        <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-zinc-700">
          <MapPin className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
          {location}
        </p>
        <Button variant="link" className="mt-1 h-auto p-0 text-emerald-700" asChild>
          <Link
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`}
            target="_blank"
            rel="noreferrer"
          >
            Otwórz w Google Maps
          </Link>
        </Button>
      </div>

      {!played && (
        <div className="mb-8">
          <TransportRosters drivers={driversOffering} riders={ridersNeeding} currentUserId={currentUserId} />
        </div>
      )}

      {played ? (
        <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-center text-sm text-zinc-700">
          Ten mecz jest już rozegrany — czat transportowy jest wyłączony.
        </p>
      ) : eligible ? (
        <section id="czat" className="space-y-3">
          <h2 className="text-lg font-semibold text-emerald-950 dark:text-emerald-100">Czat transportowy</h2>
          <p className="text-sm text-zinc-600">
            Widzą go tylko osoby z list powyżej: kierowcy z wolnymi miejscami oraz osoby potrzebujące dojazdu.
          </p>
          <TransportChatClient
            matchId={matchId}
            currentUserId={currentUserId}
            initialMessages={initialMessages}
          />
        </section>
      ) : (
        <div className="space-y-4 rounded-2xl border border-amber-200/90 bg-amber-50/80 px-4 py-5 text-sm text-amber-950 shadow-sm">
          <p className="font-medium">Czat jest dostępny tylko dla osób z kolumn na liście powyżej.</p>
          <p className="leading-relaxed text-amber-950/95">
            Czat łączy kierowców, którzy <strong>mogą zabrać pasażerów</strong>, z osobami jadącymi komunikacją, które{" "}
            <strong>potrzebują transportu</strong>. Możesz zaktualizować preferencje transportu przy zapisie na mecz.
          </p>
          {canEditTransport && (
            <Button type="button" className="bg-emerald-700 hover:bg-emerald-800" onClick={() => setEditOpen(true)}>
              Zmień preferencje transportu
            </Button>
          )}
        </div>
      )}

      {!played && canEditTransport && eligible && (
        <div className="mt-6 text-center">
          <Button type="button" variant="outline" onClick={() => setEditOpen(true)}>
            Zmień preferencje transportu
          </Button>
        </div>
      )}

      <MatchTransportSignupDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        matchId={matchId}
        intent="edit"
        initial={signup}
        onCompleted={() => window.location.reload()}
      />

      <div className="mt-8 text-center">
        <Button variant="ghost" asChild>
          <Link href="/">Wróć na stronę główną</Link>
        </Button>
      </div>
    </div>
  );
}
