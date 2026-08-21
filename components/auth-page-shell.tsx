"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { HomeFallingDecor } from "@/components/home-falling-decor";
import { MarketplacePitchPhoto } from "@/components/marketplace-pitch-photo";
import { MarketplacePhotoStrip } from "@/components/marketplace-photo-strip";
import { useMarketplacePhotos } from "@/components/marketplace-photos-provider";
import { PhotoPanel } from "@/components/photo-panel";
import { useScreenBlocks } from "@/components/screen-blocks-provider";
import { Button } from "@/components/ui/button";
import { pitchPhotoAt } from "@/lib/marketplace-photos";

type Tile = {
  href: string;
  title: string;
  desc: string;
  photoIndex: number;
};

type Step = {
  n: string;
  t: string;
  d: string;
};

type Props = {
  kicker: string;
  title: string;
  subtitle: string;
  formKicker: string;
  formTitle: string;
  formSubtitle: ReactNode;
  tiles: Tile[];
  steps: Step[];
  footerTitle: string;
  footerText: string;
  footerHref: string;
  footerLabel: string;
  children: ReactNode;
};

export function AuthPageShell({
  kicker,
  title,
  subtitle,
  formKicker,
  formTitle,
  formSubtitle,
  tiles,
  steps,
  footerTitle,
  footerText,
  footerHref,
  footerLabel,
  children,
}: Props) {
  const { photos: mpPhotos } = useMarketplacePhotos();
  const { isAdmin } = useScreenBlocks();
  const heroPhoto = pitchPhotoAt(1, mpPhotos);

  return (
    <div className="relative flex flex-1 flex-col text-zinc-900 dark:text-zinc-50">
      <HomeFallingDecor />

      <section className="mp-hero mp-hero--photo relative z-0 flex flex-col justify-end overflow-hidden pb-16 pt-16 sm:pb-20 sm:pt-24">
        <MarketplacePitchPhoto src={heroPhoto} priority className="z-0" />
        <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/75 via-black/40 to-black/20" />
        <div className="relative z-10 mx-auto w-full max-w-6xl px-4">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-white/80">{kicker}</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-tight text-white sm:text-6xl">{title}</h1>
          <p className="mt-4 max-w-xl text-base text-white/85 sm:text-lg">{subtitle}</p>
        </div>
      </section>

      <MarketplacePhotoStrip isAdmin={isAdmin} />

      <div className="relative z-10 mx-auto w-full min-w-0 max-w-6xl px-4 py-10 sm:py-12">
        <PhotoPanel
          src={pitchPhotoAt(4, mpPhotos)}
          className="min-h-[18rem]"
          contentClassName="p-5 sm:p-6"
          overlayClassName="bg-gradient-to-t from-black/80 via-black/50 to-black/20"
          sizes="(max-width: 768px) 100vw, 720px"
        >
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/80">{formKicker}</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-white drop-shadow-sm sm:text-3xl">{formTitle}</h2>
          <div className="mt-2 text-sm text-white/85">{formSubtitle}</div>
          <div className="mt-5 rounded-2xl bg-white/95 p-4 text-zinc-900 shadow-lg sm:p-5">{children}</div>
        </PhotoPanel>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {tiles.map((tile) => (
            <Link key={tile.href} href={tile.href} className="block">
              <PhotoPanel
                src={pitchPhotoAt(tile.photoIndex, mpPhotos)}
                className="min-h-[12rem] transition hover:-translate-y-0.5 hover:shadow-xl"
                contentClassName="flex min-h-[12rem] flex-col justify-end p-5"
                overlayClassName="bg-gradient-to-t from-black/75 via-black/30 to-black/10"
                sizes="(max-width: 768px) 100vw, 400px"
              >
                <p className="font-black text-white drop-shadow-sm">{tile.title}</p>
                <p className="mt-1 text-sm text-white/85">{tile.desc}</p>
              </PhotoPanel>
            </Link>
          ))}
        </div>

        <PhotoPanel
          src={pitchPhotoAt(9, mpPhotos)}
          className="mt-14 min-h-[18rem] rounded-3xl"
          contentClassName="flex min-h-[18rem] flex-col justify-center gap-6 px-6 py-10 sm:px-10 lg:flex-row lg:items-center lg:justify-between"
          overlayClassName="bg-gradient-to-r from-black/70 via-black/55 to-black/45"
          sizes="(max-width: 768px) 100vw, 1152px"
        >
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/80">Akademia</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight drop-shadow-sm">{footerTitle}</h2>
            <p className="mt-3 text-white/90">{footerText}</p>
          </div>
          <Button
            asChild
            variant="secondary"
            className="h-12 shrink-0 rounded-full bg-white px-8 font-black text-zinc-950 hover:bg-zinc-100"
          >
            <Link href={footerHref}>{footerLabel}</Link>
          </Button>
        </PhotoPanel>

        <section className="mt-14 grid gap-4 sm:grid-cols-3">
          {steps.map((step, i) => (
            <PhotoPanel
              key={step.n}
              src={pitchPhotoAt(10 + i, mpPhotos)}
              className="min-h-[15rem]"
              contentClassName="flex min-h-[15rem] flex-col justify-end p-5"
              overlayClassName="bg-gradient-to-t from-black/75 via-black/30 to-black/10"
              sizes="(max-width: 768px) 100vw, 400px"
            >
              <p className="text-3xl font-black text-white drop-shadow-sm">{step.n}</p>
              <p className="mt-2 font-black text-white drop-shadow-sm">{step.t}</p>
              <p className="mt-1 text-sm text-white/85">{step.d}</p>
            </PhotoPanel>
          ))}
        </section>
      </div>
    </div>
  );
}
