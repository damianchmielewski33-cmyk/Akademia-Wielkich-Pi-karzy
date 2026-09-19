"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AWP_SESSION_MESSAGE_TYPE,
  AWP_SITE_NAME,
  GYMBRAT_REQUEST_AWP_SESSION,
  GYMBRAT_SITE_NAME,
  getGymBratCrossLink,
  getGymBratUrl,
  isTrustedGymBratOrigin,
} from "@/lib/sister-sites";
import { isRunningInAppWebView } from "@/lib/app-webview";

type GymBratEmbedViewProps = {
  /** JWT sesji AWP (cookie / Bearer) — do postMessage i awaryjnego `awp_token` w URL. */
  sessionToken?: string | null;
};

/**
 * GymBrat w shellu AWP.
 * W APK WebView ładujemy GymBrat top-level (iframe + X-Frame-Options bywa problematyczne).
 * W zwykłej przeglądarce — pełnoekranowy iframe (wymaga frame-ancestors po stronie GymBrat).
 *
 * SSO: na `gymbrat-request-awp-session` odsyłamy `{ type: "awp-session", token }`
 * tylko do zaufanego originu GymBrat. Awaryjnie doklejamy `awp_token` do URL.
 */
export function GymBratEmbedView({ sessionToken = null }: GymBratEmbedViewProps) {
  const searchParams = useSearchParams();
  const path = searchParams.get("path")?.trim() || "/";
  const sisterPath = path.startsWith("/") ? path : `/${path}`;
  const token = sessionToken?.trim() || null;
  const src = getGymBratCrossLink(sisterPath, { awpToken: token });
  const [inAppWebView, setInAppWebView] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const tokenRef = useRef(token);
  tokenRef.current = token;

  useEffect(() => {
    const appWv = isRunningInAppWebView();
    setInAppWebView(appWv);
    if (appWv) {
      // Top-level: postMessage z parentem nie zadziała — wymagany awp_token w URL.
      window.location.replace(src);
    }
  }, [src]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (!isTrustedGymBratOrigin(event.origin)) return;
      const data = event.data as { type?: string } | null;
      if (!data || typeof data !== "object") return;
      if (data.type !== GYMBRAT_REQUEST_AWP_SESSION) return;

      const current = tokenRef.current;
      if (!current) return;

      const payload = { type: AWP_SESSION_MESSAGE_TYPE, token: current };
      const target = event.origin;
      try {
        const source = event.source as WindowProxy | null;
        if (source && typeof source.postMessage === "function") {
          source.postMessage(payload, target);
          return;
        }
        iframeRef.current?.contentWindow?.postMessage(payload, target);
      } catch {
        /* iframe niedostępny */
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Proaktywnie wyślij token po załadowaniu iframe (GymBrat może już nasłuchiwać).
  useEffect(() => {
    if (!token || inAppWebView) return;
    const gymBratOrigin = getGymBratUrl();

    function pushSession() {
      try {
        iframeRef.current?.contentWindow?.postMessage(
          { type: AWP_SESSION_MESSAGE_TYPE, token },
          gymBratOrigin
        );
      } catch {
        /* ignore */
      }
    }

    const iframe = iframeRef.current;
    iframe?.addEventListener("load", pushSession);
    // Krótki retry — GymBrat rejestruje listener przy mount `/login`.
    const t1 = window.setTimeout(pushSession, 400);
    const t2 = window.setTimeout(pushSession, 1200);
    return () => {
      iframe?.removeEventListener("load", pushSession);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [token, inAppWebView, src]);

  if (inAppWebView) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-zinc-950 px-6 text-center">
        <p className="text-sm text-zinc-300">Otwieranie {GYMBRAT_SITE_NAME}…</p>
        <Button asChild className="rounded-full font-bold">
          <a href={src}>Kontynuuj</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-950">
      <header className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-zinc-950/95 px-3 py-2.5 backdrop-blur-sm sm:px-4">
        <Link
          href="/"
          className="awp-focus-ring inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-white/85 hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          {AWP_SITE_NAME}
        </Link>
        <span className="text-white/30" aria-hidden>
          /
        </span>
        <span className="truncate text-sm font-bold text-white">{GYMBRAT_SITE_NAME}</span>
        <Button
          asChild
          size="sm"
          variant="outline"
          className="ml-auto rounded-full border-white/20 bg-transparent text-xs text-white hover:bg-white/10"
        >
          <a href={src} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Otwórz w nowej karcie
          </a>
        </Button>
      </header>
      <iframe
        ref={iframeRef}
        title={GYMBRAT_SITE_NAME}
        src={src}
        className="min-h-0 w-full flex-1 border-0 bg-zinc-950"
        allow="clipboard-write"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
