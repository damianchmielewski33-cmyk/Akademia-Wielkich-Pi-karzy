"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

type FallItem = {
  kind: "ball" | "star";
  x: string;
  size: number;
  duration: number;
  delay: number;
  drift: string;
  spin: number;
  opacity: number;
};

const LEFT: FallItem[] = [
  { kind: "ball", x: "14%", size: 58, duration: 16, delay: 0, drift: "22px", spin: 360, opacity: 0.95 },
  { kind: "star", x: "58%", size: 16, duration: 11, delay: 0.8, drift: "-14px", spin: 40, opacity: 0.9 },
  { kind: "star", x: "8%", size: 10, duration: 13.5, delay: 2.4, drift: "10px", spin: -30, opacity: 0.7 },
  { kind: "ball", x: "62%", size: 44, duration: 18, delay: 4.2, drift: "-18px", spin: -320, opacity: 0.92 },
  { kind: "star", x: "36%", size: 13, duration: 9.5, delay: 5.1, drift: "16px", spin: 55, opacity: 0.85 },
  { kind: "ball", x: "8%", size: 50, duration: 14.5, delay: 7.6, drift: "12px", spin: 280, opacity: 0.94 },
  { kind: "star", x: "78%", size: 11, duration: 12, delay: 8.8, drift: "-8px", spin: -20, opacity: 0.75 },
  { kind: "star", x: "44%", size: 8, duration: 15, delay: 10.2, drift: "6px", spin: 25, opacity: 0.6 },
];

const RIGHT: FallItem[] = [
  { kind: "star", x: "22%", size: 14, duration: 10.5, delay: 0.4, drift: "-16px", spin: -45, opacity: 0.88 },
  { kind: "ball", x: "52%", size: 56, duration: 15.5, delay: 1.6, drift: "-20px", spin: -360, opacity: 0.95 },
  { kind: "star", x: "8%", size: 9, duration: 14, delay: 3.2, drift: "12px", spin: 30, opacity: 0.68 },
  { kind: "star", x: "48%", size: 17, duration: 12.5, delay: 4.8, drift: "18px", spin: 50, opacity: 0.92 },
  { kind: "ball", x: "12%", size: 42, duration: 19, delay: 6.4, drift: "14px", spin: 300, opacity: 0.9 },
  { kind: "star", x: "78%", size: 12, duration: 11.5, delay: 8.1, drift: "-10px", spin: -35, opacity: 0.8 },
  { kind: "ball", x: "38%", size: 64, duration: 17, delay: 9.5, drift: "-24px", spin: 340, opacity: 0.96 },
  { kind: "star", x: "68%", size: 8, duration: 13, delay: 11.4, drift: "8px", spin: 20, opacity: 0.62 },
];

function FallStar({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden className="home-fall__star">
      <path
        fill="currentColor"
        d="M12 1.6 14.7 8.4 22 9.2 16.6 14 18.2 21.4 12 17.6 5.8 21.4 7.4 14 2 9.2 9.3 8.4Z"
      />
    </svg>
  );
}

/** Piłka z animacji — białe tło i panele zielony / czerwony / niebieski (jak na zdjęciu). */
function FallingSoccerBall() {
  return (
    <span className="home-fall__ball relative block h-full w-full overflow-hidden rounded-full bg-white ring-1 ring-black/25">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/trionda-ball.png"
        alt=""
        draggable={false}
        className="pointer-events-none h-full w-full scale-[1.08] object-cover object-center"
      />
      <span
        className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_32%_26%,rgba(255,255,255,0.32),transparent_40%,rgba(0,0,0,0.22)_100%)]"
        aria-hidden
      />
    </span>
  );
}

function FallPiece({ item }: { item: FallItem }) {
  return (
    <span
      className="home-fall__item"
      style={
        {
          left: item.x,
          width: item.size,
          height: item.size,
          "--dur": `${item.duration}s`,
          "--delay": `${item.delay}s`,
          "--drift": item.drift,
          "--spin": `${item.spin}deg`,
          "--op": item.opacity,
        } as CSSProperties
      }
    >
      {item.kind === "ball" ? <FallingSoccerBall /> : <FallStar size={item.size} />}
    </span>
  );
}

/** Spadające piłki nożne i gwiazdy. `cover` — przez cały ekran, także na telefonie. */
export function HomeFallingDecor({ className, cover = false }: { className?: string; cover?: boolean }) {
  return (
    <div className={cn("home-fall", cover && "home-fall--cover", className)} aria-hidden>
      <div className="home-fall__rail home-fall__rail--left">
        {LEFT.map((item, i) => (
          <FallPiece key={`l-${i}`} item={item} />
        ))}
      </div>
      <div className="home-fall__rail home-fall__rail--right">
        {RIGHT.map((item, i) => (
          <FallPiece key={`r-${i}`} item={item} />
        ))}
      </div>
    </div>
  );
}
