import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { parseRealm, realmTerminarzPath } from "@/lib/realm";

type PageProps = {
  params: Promise<{ matchId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: "Losowanie kapitanów",
  description: "Koło fortuny — losowanie kapitanów na mecz w Akademii Wielkich Piłkarzy.",
};

export default async function CaptainLotteryRedirectPage({ params, searchParams }: PageProps) {
  const { matchId: raw } = await params;
  const matchId = Number.parseInt(raw, 10);
  if (!Number.isFinite(matchId) || matchId <= 0) {
    notFound();
  }

  const db = await getDb();
  const row = (await db
    .prepare("SELECT id, realm FROM matches WHERE id = ?")
    .get(matchId)) as { id: number; realm: string | null } | undefined;

  if (!row) notFound();

  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === "string") qs.set(key, value);
  }
  qs.set("mecz", String(matchId));
  qs.set("losowanie", "1");

  const realm = parseRealm(row.realm);
  redirect(`${realmTerminarzPath(realm)}?${qs.toString()}`);
}
