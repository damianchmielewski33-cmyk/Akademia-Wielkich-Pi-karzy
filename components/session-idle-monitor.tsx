"use client";

import { useEffect, useRef } from "react";

const IDLE_MS = 30 * 60 * 1000;
const MOUSE_MOVE_THROTTLE_MS = 1000;
const TICK_MS = 15 * 1000;

/**
 * Wylogowuje po `IDLE_MS` bez interakji z dokumentem (gdy w JWT `rememberMe` jest false).
 */
export function SessionIdleMonitor({ enabled }: { enabled: boolean }) {
  const lastActivityRef = useRef(Date.now());
  const mouseThrottleRef = useRef(0);
  const loggingOutRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    lastActivityRef.current = Date.now();

    function bump() {
      lastActivityRef.current = Date.now();
    }

    function onMouseMove() {
      const n = Date.now();
      if (n - mouseThrottleRef.current < MOUSE_MOVE_THROTTLE_MS) return;
      mouseThrottleRef.current = n;
      bump();
    }

    const opts: AddEventListenerOptions = { capture: true, passive: true };
    const events: (keyof WindowEventMap)[] = ["keydown", "click", "scroll", "touchstart", "wheel"];
    window.addEventListener("mousemove", onMouseMove, opts);
    for (const e of events) {
      window.addEventListener(e, bump, opts);
    }

    const tick = window.setInterval(() => {
      if (loggingOutRef.current) return;
      if (document.visibilityState === "hidden") return;
      if (Date.now() - lastActivityRef.current < IDLE_MS) return;
      loggingOutRef.current = true;
      void (async () => {
        try {
          await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
        } catch {
          /* ignore */
        }
        window.location.assign("/login?wylogowano=bezczynnosc");
      })();
    }, TICK_MS);

    return () => {
      window.clearInterval(tick);
      window.removeEventListener("mousemove", onMouseMove, opts);
      for (const e of events) {
        window.removeEventListener(e, bump, opts);
      }
    };
  }, [enabled]);

  return null;
}
