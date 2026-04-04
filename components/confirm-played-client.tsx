"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ConfirmPlayedClient({ matchId }: { matchId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");

  useEffect(() => {
    const id = Number(matchId);
    if (!Number.isFinite(id)) {
      setStatus("err");
      return;
    }
    (async () => {
      const res = await fetch(`/api/admin/match/${id}/set-played`, { method: "POST" });
      if (res.ok) {
        setStatus("ok");
        toast.success("Mecz oznaczony jako rozegrany");
        router.replace("/terminarz");
      } else {
        setStatus("err");
        toast.error("Brak uprawnien lub blad");
      }
    })();
  }, [matchId, router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center p-6">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Potwierdzanie rozegrania</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-emerald-900">
          {status === "idle" && <p>Przetwarzanie…</p>}
          {status === "err" && <p>Nie udalo sie potwierdzic. Zaloguj sie jako admin i sprobuj ponownie.</p>}
          <Button variant="outline" onClick={() => router.push("/terminarz")}>
            Terminarz
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
