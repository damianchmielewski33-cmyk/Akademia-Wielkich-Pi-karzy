"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/app-toast";
import { Button } from "@/components/ui/button";

type InviteInfo = {
  label: string | null;
  status: "open" | "claimed" | "revoked" | "expired";
  expires_at: string | null;
};

export function PartnerInviteClient({
  token,
  isLoggedIn,
}: {
  token: string;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const next = `/partner/zaproszenie/${token}`;

  useEffect(() => {
    fetch(`/api/partner/invite/${token}`)
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          setError(typeof data.error === "string" ? data.error : "Nieprawidłowy link");
          return;
        }
        setInfo(data as InviteInfo);
      })
      .catch(() => setError("Nie udało się sprawdzić zaproszenia"));
  }, [token]);

  async function claim() {
    setBusy(true);
    try {
      const res = await fetch(`/api/partner/invite/${token}/claim`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Nie udało się aktywować panelu");
        return;
      }
      toast.success("Panel partnera aktywny");
      router.push("/partner");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-12">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--mp-teal-dark)]">
        Partner obiektu
      </p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-950 dark:text-white">
        Zarządzaj swoim boiskiem
      </h1>
      <p className="mt-3 text-zinc-600 dark:text-zinc-300">
        Po aktywacji dodasz obiekt, cennik, godziny dostępności i wolne terminy. Gracze rezerwują je online.
      </p>

      <section className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : !info ? (
          <p className="text-sm text-zinc-500">Sprawdzanie linku...</p>
        ) : info.status === "revoked" || info.status === "expired" ? (
          <p className="text-sm text-zinc-600">
            Ten link jest już nieważny. Poproś akademię o nowe zaproszenie.
          </p>
        ) : (
          <>
            {info.label ? <p className="font-semibold text-zinc-950 dark:text-white">{info.label}</p> : null}
            {info.expires_at ? (
              <p className="mt-1 text-sm text-zinc-500">
                Link ważny do {new Date(info.expires_at).toLocaleString("pl-PL")}
              </p>
            ) : null}
            {isLoggedIn ? (
              <Button className="mt-6 w-full" disabled={busy} onClick={() => void claim()}>
                {busy ? "Aktywacja..." : info.status === "claimed" ? "Wejdź do panelu" : "Aktywuj panel partnera"}
              </Button>
            ) : (
              <div className="mt-6 flex flex-col gap-3">
                <Button asChild>
                  <Link href={`/register?next=${encodeURIComponent(next)}`}>Zarejestruj się i przejmij obiekt</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/login?next=${encodeURIComponent(next)}`}>Mam już konto — zaloguj się</Link>
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
