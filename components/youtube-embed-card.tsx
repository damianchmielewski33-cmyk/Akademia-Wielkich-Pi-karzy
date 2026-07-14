import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  videoId: string;
  title: string;
  subtitle?: string;
  className?: string;
  iframeTitle?: string;
};

export function YoutubeEmbedCard({ videoId, title, subtitle, className, iframeTitle }: Props) {
  const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;

  return (
    <article
      className={cn(
        "overflow-hidden rounded-2xl border-2 border-emerald-200/80 bg-emerald-950/[0.03] shadow-lg shadow-emerald-950/10 ring-1 ring-emerald-900/10 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:ring-emerald-500/10",
        className
      )}
    >
      <div className="border-b border-emerald-200/60 bg-gradient-to-r from-emerald-800/10 to-emerald-600/5 px-4 py-3 dark:border-emerald-800/50 dark:from-emerald-900/40 dark:to-emerald-950/20 sm:px-5">
        <div className="flex flex-wrap items-start gap-2 sm:gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold tracking-tight text-emerald-950 dark:text-emerald-100 sm:text-xl">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">{subtitle}</p>
            ) : null}
          </div>
          <Link
            href={watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-emerald-800 underline decoration-emerald-800/30 underline-offset-2 hover:text-emerald-950 dark:text-emerald-300 dark:decoration-emerald-400/40 dark:hover:text-emerald-200"
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Otwórz w YouTube
          </Link>
        </div>
      </div>
      <div className="relative aspect-video w-full bg-black">
        <iframe
          title={iframeTitle ?? title}
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube.com/embed/${encodeURIComponent(videoId)}?rel=0`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </article>
  );
}
