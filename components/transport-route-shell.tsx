"use client";

import { useEffect, useState } from "react";
import { TransportEnterPreloader } from "@/components/transport-enter-preloader";

export function TransportRouteShell({ children }: { children: React.ReactNode }) {
  const [showOverlay, setShowOverlay] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const ms = mq.matches ? 520 : 3100;
    const t = window.setTimeout(() => setShowOverlay(false), ms);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="relative min-h-[50vh]">
      {showOverlay && (
        <div
          className="fixed inset-0 z-[200] flex flex-col bg-slate-950"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <span className="sr-only">Ładowanie widoku transportu</span>
          <TransportEnterPreloader />
        </div>
      )}
      <div
        className={
          showOverlay ? "pointer-events-none min-h-[50vh] select-none opacity-0" : "opacity-100 transition-opacity duration-500"
        }
      >
        {children}
      </div>
    </div>
  );
}
