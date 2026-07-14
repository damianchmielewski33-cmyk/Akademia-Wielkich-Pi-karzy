"use client";

import { Film } from "lucide-react";
import type { GalleryVideoPublic } from "@/lib/gallery-videos";
import { PitchCard, PitchPageHero, pitchLabelClass } from "@/components/ui/pitch-card";
import { YoutubeEmbedCard } from "@/components/youtube-embed-card";

function formatMatchDateLabel(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")}.${y}`;
}

type Props = {
  videos: GalleryVideoPublic[];
};

export function GaleriaClient({ videos }: Props) {
  return (
    <div className="container mx-auto max-w-5xl flex-1 px-4 py-8 sm:py-10">
      <PitchPageHero
        title="Galeria meczów"
        subtitle="Nagrania z naszych spotkań na boisku — oglądaj bezpośrednio na stronie Akademii."
      />

      {videos.length === 0 ? (
        <PitchCard className="mt-8 text-left" contentClassName="p-6 sm:p-8">
          <span className={pitchLabelClass}>Brak nagrań</span>
          <p className="mt-4 text-sm leading-relaxed text-emerald-100/90">
            Wkrótce pojawią się tu filmy z meczów. Wróć później lub sprawdź terminarz nadchodzących spotkań.
          </p>
        </PitchCard>
      ) : (
        <div className="mt-8 space-y-8">
          {videos.map((video) => (
            <YoutubeEmbedCard
              key={video.id}
              videoId={video.youtubeVideoId}
              title={video.title}
              subtitle={
                video.matchDate
                  ? `Mecz z dnia ${formatMatchDateLabel(video.matchDate)}`
                  : "Nagranie z meczu Akademii Wielkich Piłkarzy"
              }
              iframeTitle={`${video.title} — YouTube`}
            />
          ))}
        </div>
      )}

      <p className="mt-10 flex items-center justify-center gap-2 text-center text-sm text-zinc-600 dark:text-zinc-400">
        <Film className="h-4 w-4 shrink-0" aria-hidden />
        Filmy hostowane na YouTube — odtwarzane w osadzeniu na stronie.
      </p>
    </div>
  );
}
