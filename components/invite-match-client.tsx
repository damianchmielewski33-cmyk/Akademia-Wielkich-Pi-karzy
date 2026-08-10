"use client";

import { Suspense, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/app-toast";
import type { MatchRow } from "@/lib/db";
import type { PlayersDataEntry } from "@/lib/terminarz-shared";
import { InviteShareLanding } from "@/components/invite-share-landing";
import { MatchTransportSignupDialog } from "@/components/match-transport-signup-dialog";
import { useHotpayPaymentReturn } from "@/hooks/use-hotpay-payment-return";

type Props = {
  matchId: number;
  match: MatchRow | null;
  playersData: Record<number, PlayersDataEntry>;
  isLoggedIn: boolean;
  userSignupKind: Record<number, "tentative" | "confirmed" | "declined">;
  hotpayEnabled?: boolean;
};

function InviteHotpayReturnHandler({ onSettled }: { onSettled: () => void }) {
  useHotpayPaymentReturn({ onSettled });
  return null;
}

export function InviteMatchClient({
  matchId,
  match,
  playersData,
  isLoggedIn,
  userSignupKind,
  hotpayEnabled = false,
}: Props) {
  const router = useRouter();
  const [transportSignupOpen, setTransportSignupOpen] = useState(false);
  const [transportSignupIntent, setTransportSignupIntent] = useState<"signup" | "confirm">("signup");
  const [tentativeBusy, setTentativeBusy] = useState(false);
  const [inviteLoginInline, setInviteLoginInline] = useState(false);
  const [inviteGuestInline, setInviteGuestInline] = useState(false);

  const openTransportSignup = useCallback(() => {
    setTransportSignupIntent("signup");
    setTransportSignupOpen(true);
  }, []);

  const onPaymentSettled = useCallback(() => {
    router.refresh();
  }, [router]);

  async function signupTentative() {
    setTentativeBusy(true);
    try {
      const res = await fetch(`/api/terminarz/signup/${matchId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commitment: "tentative" }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Nie udało się zapisać");
        return;
      }
      toast.success("Zapisano: jeszcze nie wiem");
      router.refresh();
    } finally {
      setTentativeBusy(false);
    }
  }

  async function signupDeclined() {
    setTentativeBusy(true);
    try {
      const res = await fetch(`/api/terminarz/signup/${matchId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commitment: "declined" }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Nie udało się zapisać");
        return;
      }
      toast.success("Zapisano: nie biorę udziału");
      router.refresh();
    } finally {
      setTentativeBusy(false);
    }
  }

  function onParticipationTak() {
    if (!match) return;
    const free = match.max_slots - match.signed_up;
    if (free <= 0) {
      toast.warning(
        "Skład jest pełny — nie możesz teraz zająć miejsca. Wybierz „Jeszcze nie wiem” (bez miejsca w składzie) albo „Nie, nie biorę udziału”."
      );
      return;
    }
    openTransportSignup();
  }

  return (
    <>
      <Suspense fallback={null}>
        <InviteHotpayReturnHandler onSettled={onPaymentSettled} />
      </Suspense>
      <InviteShareLanding
        highlightMatchId={matchId}
        match={match}
        playersData={playersData}
        isLoggedIn={isLoggedIn}
        userSignupKind={userSignupKind}
        inviteLoginInline={inviteLoginInline}
        setInviteLoginInline={setInviteLoginInline}
        inviteGuestInline={inviteGuestInline}
        setInviteGuestInline={setInviteGuestInline}
        onGuestSignedUp={() => router.refresh()}
        tentativeBusy={tentativeBusy}
        onParticipationTak={onParticipationTak}
        onParticipationTentative={() => void signupTentative()}
        onParticipationNie={() => void signupDeclined()}
        onAuthenticated={() => setInviteLoginInline(false)}
        hotpayEnabled={hotpayEnabled}
      />
      <MatchTransportSignupDialog
        open={transportSignupOpen}
        onOpenChange={setTransportSignupOpen}
        matchId={matchId}
        intent={transportSignupIntent === "confirm" ? "confirm" : "signup"}
        hotpayEnabled={hotpayEnabled}
        onCompleted={() => {
          router.refresh();
        }}
      />
    </>
  );
}
