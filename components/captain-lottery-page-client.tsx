"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { MatchRow } from "@/lib/db";
import type { CaptainLotteryEntry } from "@/lib/captain-lottery";
import type { Realm } from "@/lib/realm";
import type { PlayersDataEntry } from "@/lib/terminarz-shared";
import { CaptainLotteryDialog } from "@/components/captain-lottery-dialog";

type Props = {
  match: MatchRow;
  playersData: PlayersDataEntry;
  initialLottery: CaptainLotteryEntry | null;
  lotteryHistory: CaptainLotteryEntry[];
  isLoggedIn: boolean;
  isAdmin: boolean;
  realm: Realm;
  terminarzPath: string;
};

export function CaptainLotteryPageClient({
  match,
  playersData,
  initialLottery,
  lotteryHistory,
  isLoggedIn,
  isAdmin,
  realm,
  terminarzPath,
}: Props) {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(isLoggedIn);
  const [admin, setAdmin] = useState(isAdmin);
  const [lottery, setLottery] = useState<CaptainLotteryEntry | null>(initialLottery);
  const [history, setHistory] = useState<CaptainLotteryEntry[]>(lotteryHistory);

  useEffect(() => {
    setLoggedIn(isLoggedIn);
    setAdmin(isAdmin);
  }, [isLoggedIn, isAdmin]);

  useEffect(() => {
    setLottery(initialLottery);
    setHistory(lotteryHistory);
  }, [initialLottery, lotteryHistory]);

  function handleLotteryChange(matchId: number, entry: CaptainLotteryEntry | null) {
    if (matchId !== match.id) return;
    setLottery(entry);
    if (entry) {
      setHistory((prev) => {
        const without = prev.filter((x) => x.id !== entry.id);
        return [entry, ...without].sort((a, b) => b.roundNumber - a.roundNumber);
      });
    } else {
      setHistory([]);
    }
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      router.push(terminarzPath);
    }
  }

  function handleAuthenticated() {
    setLoggedIn(true);
    router.refresh();
  }

  return (
    <CaptainLotteryDialog
      open
      onOpenChange={handleOpenChange}
      match={match}
      playersData={playersData}
      initialLottery={lottery}
      lotteryHistory={history}
      isLoggedIn={loggedIn}
      isAdmin={admin}
      realm={realm}
      onAuthenticated={handleAuthenticated}
      onLotteryChange={handleLotteryChange}
    />
  );
}
