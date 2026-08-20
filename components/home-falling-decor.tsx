"use client";

import { useId, type CSSProperties } from "react";
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

/** Klasyczna piłka Telstar — czarne pięciokąty i białe sześciokąty. */
function FallingSoccerBall() {
  const uid = useId().replace(/:/g, "");
  const clip = `soccer-clip-${uid}`;
  const fill = `soccer-fill-${uid}`;

  return (
    <svg viewBox="0 0 200 200" aria-hidden className="home-fall__ball h-full w-full">
      <defs>
        <clipPath id={clip}>
          <circle cx="100" cy="100" r="92" />
        </clipPath>
        <radialGradient id={fill} cx="34%" cy="28%" r="74%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="48%" stopColor="#f4f4f5" />
          <stop offset="82%" stopColor="#d4d4d8" />
          <stop offset="100%" stopColor="#a1a1aa" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="92" fill={`url(#${fill})`} stroke="#111827" strokeWidth="6" />
      <g clipPath={`url(#${clip})`} stroke="#111827" strokeLinejoin="round">
        <polygon fill="#111827" strokeWidth="1" points="100,74 119.02,87.82 111.76,110.18 88.24,110.18 80.98,87.82" />
        <polygon fill="#111827" strokeWidth="1" points="100,6 115.22,17.06 109.4,34.94 90.6,34.94 84.78,17.06" />
        <polygon fill="#111827" strokeWidth="1" points="183.7,66.81 177.88,84.69 159.08,84.69 153.26,66.81 168.48,55.75" />
        <polygon fill="#111827" strokeWidth="1" points="151.72,165.19 132.92,165.19 127.1,147.31 142.32,136.25 157.54,147.31" />
        <polygon fill="#111827" strokeWidth="1" points="48.28,165.19 42.46,147.31 57.68,136.25 72.9,147.31 67.08,165.19" />
        <polygon fill="#111827" strokeWidth="1" points="16.3,66.81 31.52,55.75 46.74,66.81 40.92,84.69 22.12,84.69" />
        <polygon fill="none" strokeWidth="3.4" points="134.09,47.08 141.41,63.52 130.83,78.08 112.93,76.2 105.61,59.76 116.19,45.2" />
        <polygon fill="none" strokeWidth="3.4" points="155.16,111.92 141.78,123.97 124.66,118.4 120.92,100.8 134.3,88.75 151.42,94.32" />
        <polygon fill="none" strokeWidth="3.4" points="100,152 84.41,143 84.41,125 100,116 115.59,125 115.59,143" />
        <polygon fill="none" strokeWidth="3.4" points="44.84,111.92 48.58,94.32 65.7,88.75 79.08,100.8 75.34,118.4 58.22,123.97" />
        <polygon fill="none" strokeWidth="3.4" points="65.91,47.08 83.81,45.2 94.39,59.76 87.07,76.2 69.17,78.08 58.59,63.52" />
      </g>
      <circle cx="68" cy="62" r="22" fill="#ffffff" opacity="0.28" />
    </svg>
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
