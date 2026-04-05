"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { PlayerAvatar, PlayerNameStack } from "@/components/player-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

  return (
    <div className="flex flex-col rounded-2xl border border-emerald-200/80 bg-white shadow-sm">
      <div className="max-h-[min(420px,55vh)] space-y-3 overflow-y-auto px-3 py-3 sm:px-4">
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500">
            Brak wiadomości — napisz pierwszą propozycję dojazdu lub miejsce zbiórki.
          </p>
        ) : (
          items.map((m) => {
            const mine = m.userId === currentUserId;
            return (
              <div
                key={m.id}
                className={`flex gap-2 ${mine ? "flex-row-reverse" : "flex-row"}`}
              >
                <PlayerAvatar
                  photoPath={null}
                  firstName={m.firstName}
                  lastName={m.lastName}
                  size="sm"
                  ringClassName="ring-2 ring-emerald-200/90"
                />
                <div
                  className={`max-w-[min(100%,20rem)] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                    mine
                      ? "bg-emerald-700 text-white"
                      : "border border-zinc-200/90 bg-zinc-50 text-zinc-900"
                  }`}
                >
                  {!mine && (
                    <div className="mb-1 text-xs font-semibold text-emerald-900">
                      <PlayerNameStack firstName={m.firstName} lastName={m.lastName} nick={m.zawodnik} />
                    </div>
                  )}
                  <p className="whitespace-pre-wrap break-words leading-relaxed">{m.body}</p>
                  <p className={`mt-1 text-[10px] ${mine ? "text-emerald-100/90" : "text-zinc-500"}`}>
                    {formatWhen(m.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2 border-t border-zinc-200/80 p-3">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Napisz wiadomość do grupy transportowej…"
          maxLength={1500}
          className="flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <Button
          type="button"
          className="shrink-0 bg-emerald-700 hover:bg-emerald-800"
          onClick={() => void send()}
          disabled={sending || !text.trim()}
        >
          <Send className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
