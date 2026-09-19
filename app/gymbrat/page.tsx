import type { Metadata } from "next";
import { Suspense } from "react";
import { GymBratEmbedView } from "@/components/gymbrat-embed-view";
import { readSessionTokenFromRequest } from "@/lib/auth";
import { GYMBRAT_SITE_NAME, GYMBRAT_SITE_TAGLINE } from "@/lib/sister-sites";

export const metadata: Metadata = {
  title: GYMBRAT_SITE_NAME,
  description: GYMBRAT_SITE_TAGLINE,
};

export default async function GymBratEmbedPage() {
  const sessionToken = await readSessionTokenFromRequest();

  return (
    <Suspense fallback={<div className="min-h-[50vh] bg-zinc-950" aria-hidden />}>
      <GymBratEmbedView sessionToken={sessionToken} />
    </Suspense>
  );
}
