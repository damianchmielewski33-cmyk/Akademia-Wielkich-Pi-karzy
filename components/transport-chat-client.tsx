"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { PlayerAvatar } from "@/components/player-avatar";
import {
  ChatBubble,
  ChatComposerField,
  ChatComposerShell,
  ChatTranscript,
  chatClusterForIndex,
} from "@/components/chat-composer-extras";
import { Button } from "@/components/ui/button";

function formatWhen(createdAt: string) {
  return createdAt.includes("T")
    ? createdAt.replace("T", " ").slice(0, 16)
    : createdAt.slice(0, 16);
}

export type TransportMessageDTO = {
  id: number;
  body: string;
  createdAt: string;
  userId: number;
  firstName: string;
  lastName: string;
  zawodnik: string;
};

type Props = {
  matchId: number;
  currentUserId: number;
  initialMessages: TransportMessageDTO[];
};

export function TransportChatClient({ matchId, currentUserId, initialMessages }: Props) {
  const [items, setItems] = useState<TransportMessageDTO[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [items, scrollToBottom]);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/terminarz/transport/${matchId}/messages`);
    if (!res.ok) return;
    const data = (await res.json()) as { messages?: TransportMessageDTO[] };
    if (Array.isArray(data.messages)) setItems(data.messages);
  }, [matchId]);

  useEffect(() => {
    const t = window.setInterval(() => {
      void refresh();
    }, 8000);
    return () => window.clearInterval(t);
  }, [refresh]);

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/terminarz/transport/${matchId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Nie wysłano wiadomości");
        return;
      }
      setText("");
      await refresh();
    } finally {
      setSending(false);
    }
  }

  const clustered = items.map((m) => ({
    mine: m.userId === currentUserId,
    senderKey: String(m.userId),
  }));

  return (
    <div className="flex flex-col gap-3 overflow-hidden rounded-2xl border border-emerald-200/80 bg-white/95 p-3 shadow-sm dark:border-emerald-900/40 dark:bg-zinc-950/40 sm:p-4">
      <ChatTranscript
        tone="light"
        className="max-h-[min(420px,55vh)] min-h-[14rem]"
        empty={
          items.length === 0 ? (
            <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
              Brak wiadomości — napisz pierwszą propozycję dojazdu lub miejsce zbiórki.
            </p>
          ) : undefined
        }
      >
        {items.map((m, i) => {
          const mine = m.userId === currentUserId;
          return (
            <ChatBubble
              key={m.id}
              body={m.body}
              senderLabel={mine ? null : `${m.firstName} ${m.lastName}`.trim() || m.zawodnik}
              timeLabel={formatWhen(m.createdAt)}
              mine={mine}
              tone="light"
              cluster={chatClusterForIndex(clustered, i)}
              avatar={
                <PlayerAvatar
                  photoPath={null}
                  firstName={m.firstName}
                  lastName={m.lastName}
                  size="sm"
                  ringClassName="ring-2 ring-emerald-200/90"
                />
              }
            />
          );
        })}
        <div ref={bottomRef} />
      </ChatTranscript>

      <ChatComposerShell tone="light">
        <ChatComposerField
          tone="light"
          value={text}
          onChange={setText}
          placeholder="Aa"
          disabled={sending}
          rows={1}
          fieldRef={fieldRef}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <Button
          type="button"
          size="icon"
          variant="stadium"
          className="h-10 w-10 shrink-0 rounded-full"
          onClick={() => void send()}
          disabled={sending || !text.trim()}
          aria-label="Wyślij"
        >
          <Send className="h-4 w-4" aria-hidden />
        </Button>
      </ChatComposerShell>
    </div>
  );
}
