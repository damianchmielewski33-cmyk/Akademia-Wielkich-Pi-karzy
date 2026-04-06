"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AuthGoalPreloader,
  AUTH_SUCCESS_PRELOADER_DELAY_MS,
} from "@/components/auth-goal-preloader";
import { InitialPinForm } from "@/components/initial-pin-form";
import { Button } from "@/components/ui/button";
import { ALL_PLAYERS } from "@/lib/constants";

export function UstawPinView({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const next = nextPath.startsWith("/") ? nextPath : "/";
  const [showGoal, setShowGoal] = useState(false);

  return (
    <>
      {showGoal && <AuthGoalPreloader label="PIN ustawiony — witamy!" />}
      <InitialPinForm
        aliases={ALL_PLAYERS}
        fieldIdPrefix="up"
        submitLabel="Ustaw PIN i kontynuuj"
        onSuccess={async () => {
          setShowGoal(true);
          await new Promise((r) => setTimeout(r, AUTH_SUCCESS_PRELOADER_DELAY_MS));
          router.push(next);
          router.refresh();
        }}
      />
      <div className="mt-6 flex flex-col gap-2 border-t border-zinc-100 pt-4 text-center text-sm">
        <Link href="/login" className="font-medium text-emerald-700 hover:underline">
          Wróć do logowania
        </Link>
        <Button variant="ghost" className="h-auto text-zinc-600" asChild>
          <a href="/api/auth/logout">Wyloguj (inne konto)</a>
        </Button>
      </div>
    </>
  );
}
