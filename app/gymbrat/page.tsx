import type { Metadata } from "next";
import { Suspense } from "react";
import { GymBratEmbedView } from "@/components/gymbrat-embed-view";
import { GYMBRAT_SITE_NAME, GYMBRAT_SITE_TAGLINE } from "@/lib/sister-sites";

export const metadata: Metadata = {
  title: GYMBRAT_SITE_NAME,
  description: GYMBRAT_SITE_TAGLINE,
};

export default function GymBratEmbedPage() {
  return (
    <Suspense fallback={<div className="min-h-[50vh] bg-zinc-950" aria-hidden />}>
      <GymBratEmbedView />
    </Suspense>
  );
}
