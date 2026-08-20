"use client";

import { useState } from "react";
import { resolveMarketplacePhoto } from "@/lib/marketplace-photos";
import { cn } from "@/lib/utils";

type Props = {
  photos: string[];
  name: string;
};

export function VenueGallery({ photos, name }: Props) {
  const urls = photos.filter(Boolean).map(resolveMarketplacePhoto).slice(0, 3);
  const [active, setActive] = useState(0);
  if (urls.length === 0) return null;
  const current = urls[Math.min(active, urls.length - 1)]!;

  if (urls.length === 1) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={current} alt={name} className="h-64 w-full object-cover sm:h-[28rem]" />
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] sm:grid-rows-2 sm:h-[28rem]">
      <button type="button" onClick={() => setActive(0)} className="relative sm:row-span-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={urls[0]}
          alt={name}
          className={cn("h-56 w-full object-cover sm:h-full", active === 0 ? "ring-2 ring-inset ring-white" : "")}
        />
      </button>
      {urls.slice(1).map((url, index) => (
        <button key={url} type="button" onClick={() => setActive(index + 1)} className="relative hidden sm:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="h-full w-full object-cover" />
        </button>
      ))}
      <div className="grid grid-cols-2 gap-2 p-2 sm:hidden">
        {urls.map((url, index) => (
          <button
            key={url}
            type="button"
            onClick={() => setActive(index)}
            className={cn("overflow-hidden rounded-xl", index === active ? "ring-2 ring-[var(--mp-teal)]" : "")}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-20 w-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
