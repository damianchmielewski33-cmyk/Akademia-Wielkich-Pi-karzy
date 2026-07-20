"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode, type Ref } from "react";
import { ImagePlus, Smile, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Popularne emotki w stylu Messengera (sport + reakcje). */
export const CHAT_EMOJI_LIST = [
  "😀",
  "😁",
  "😂",
  "🤣",
  "😊",
  "😍",
  "🥰",
  "😎",
  "🤔",
  "😅",
  "😢",
  "😭",
  "😡",
  "👍",
  "👎",
  "👏",
  "🙌",
  "🔥",
  "❤️",
  "💙",
  "💚",
  "💛",
  "✅",
  "❌",
  "⚽",
  "🏆",
  "🥇",
  "💪",
  "🥅",
  "🏃",
  "👟",
  "🎉",
  "🥳",
  "👋",
  "🙏",
  "💯",
  "⭐",
  "👀",
  "🤝",
  "🫡",
] as const;

export type ChatTone = "pitch" | "light";

type EmojiPickerProps = {
  onPick: (emoji: string) => void;
  disabled?: boolean;
  className?: string;
  tone?: ChatTone;
};

export function ChatEmojiPicker({ onPick, disabled, className, tone = "pitch" }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const light = tone === "light";

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled}
        className={cn(
          "h-10 w-10 shrink-0 rounded-full",
          light
            ? "text-emerald-700 hover:bg-emerald-50 hover:text-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-950/50"
            : "text-emerald-100/90 hover:bg-white/10 hover:text-white"
        )}
        aria-label="Emotki"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Smile className="h-5 w-5" aria-hidden />
      </Button>
      {open ? (
        <div
          className={cn(
            "absolute bottom-[calc(100%+0.45rem)] left-0 z-50 w-[min(17.5rem,calc(100vw-2rem))] rounded-2xl border p-2 shadow-xl backdrop-blur-md",
            light
              ? "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
              : "border-white/20 bg-emerald-950/95"
          )}
          role="group"
          aria-label="Lista emotek"
        >
          <div className="grid grid-cols-8 gap-0.5">
            {CHAT_EMOJI_LIST.map((emoji) => (
              <button
                key={emoji}
                type="button"
                aria-label={emoji}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg text-lg transition-colors",
                  light ? "hover:bg-emerald-50 dark:hover:bg-emerald-950/40" : "hover:bg-white/15"
                )}
                onClick={() => {
                  onPick(emoji);
                  setOpen(false);
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

type AttachmentBarProps = {
  disabled?: boolean;
  attachmentUrl: string | null;
  previewUrl: string | null;
  onUploaded: (url: string, preview: string) => void;
  onClear: () => void;
  onUploadingChange?: (uploading: boolean) => void;
  tone?: ChatTone;
};

export function ChatAttachmentControls({
  disabled,
  attachmentUrl,
  previewUrl,
  onUploaded,
  onClear,
  onUploadingChange,
  tone = "pitch",
}: AttachmentBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const light = tone === "light";

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Plik jest za duży (max 2 MB).");
      return;
    }
    const form = new FormData();
    form.append("file", file);
    setUploading(true);
    onUploadingChange?.(true);
    try {
      const res = await fetch("/api/contact-admin/attachment", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        toast.error(typeof data.error === "string" ? data.error : "Nie udało się wgrać grafiki.");
        return;
      }
      const preview = URL.createObjectURL(file);
      onUploaded(data.url, preview);
    } catch {
      toast.error("Nie udało się wgrać grafiki.");
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        disabled={disabled || uploading}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          void onFile(f);
        }}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled || uploading}
        className={cn(
          "h-10 w-10 shrink-0 rounded-full",
          light
            ? "text-emerald-700 hover:bg-emerald-50 hover:text-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-950/50"
            : "text-emerald-100/90 hover:bg-white/10 hover:text-white"
        )}
        aria-label="Dołącz grafikę"
        onClick={() => inputRef.current?.click()}
      >
        <ImagePlus className="h-5 w-5" aria-hidden />
      </Button>
      {attachmentUrl && previewUrl ? (
        <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-emerald-300/40 shadow-sm ring-1 ring-emerald-900/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            className="absolute right-0.5 top-0.5 rounded-full bg-black/70 p-0.5 text-white"
            aria-label="Usuń załącznik"
            onClick={onClear}
          >
            <X className="h-3 w-3" aria-hidden />
          </button>
        </div>
      ) : uploading ? (
        <span className={cn("text-xs", light ? "text-zinc-500" : "text-emerald-100/70")}>Wgrywanie…</span>
      ) : null}
    </div>
  );
}

export type ChatCluster = "single" | "start" | "middle" | "end";

type BubbleProps = {
  body: string;
  attachmentUrl?: string | null;
  senderLabel?: string | null;
  timeLabel: string;
  mine: boolean;
  /** `pitch` — murawa/admin; `light` — jasny modal / transport. */
  tone?: ChatTone;
  /** Grupowanie jak w Messengerze (zaokrąglenia w łańcuchu). */
  cluster?: ChatCluster;
  avatar?: ReactNode;
  showTime?: boolean;
  /** Pokazuje przycisk usuwania (np. własne wiadomości / admin). */
  onDelete?: () => void;
  deleting?: boolean;
};

function bubbleRadius(mine: boolean, cluster: ChatCluster) {
  if (mine) {
    switch (cluster) {
      case "start":
        return "rounded-[1.15rem] rounded-br-md";
      case "middle":
        return "rounded-[1.15rem] rounded-r-md";
      case "end":
        return "rounded-[1.15rem] rounded-tr-md";
      default:
        return "rounded-[1.15rem] rounded-br-md";
    }
  }
  switch (cluster) {
    case "start":
      return "rounded-[1.15rem] rounded-bl-md";
    case "middle":
      return "rounded-[1.15rem] rounded-l-md";
    case "end":
      return "rounded-[1.15rem] rounded-tl-md";
    default:
      return "rounded-[1.15rem] rounded-bl-md";
  }
}

export function ChatBubble({
  body,
  attachmentUrl,
  senderLabel,
  timeLabel,
  mine,
  tone = "pitch",
  cluster = "single",
  avatar,
  showTime = true,
  onDelete,
  deleting,
}: BubbleProps) {
  const text = body.trim();
  const imageOnly = Boolean(attachmentUrl) && !text;
  const light = tone === "light";
  const showName = Boolean(senderLabel) && !mine && (cluster === "single" || cluster === "start");
  const showMeta = showTime && (cluster === "single" || cluster === "end");

  return (
    <div
      className={cn(
        "group/bubble flex items-end gap-2",
        mine ? "justify-end" : "justify-start",
        cluster === "middle" || cluster === "end" ? "mt-0.5" : "mt-2.5 first:mt-0"
      )}
    >
      {!mine && avatar ? (
        <div className={cn("mb-0.5 shrink-0", !showMeta && "invisible")}>{avatar}</div>
      ) : null}

      <div className={cn("flex min-w-0 max-w-[min(85%,22rem)] flex-col", mine ? "items-end" : "items-start")}>
        {showName ? (
          <p
            className={cn(
              "mb-1 px-1 text-[11px] font-semibold tracking-wide",
              light ? "text-emerald-800 dark:text-emerald-300" : "text-[var(--mundial-gold)]"
            )}
          >
            {senderLabel}
          </p>
        ) : null}

        <div className={cn("flex max-w-full items-end gap-1", mine ? "flex-row-reverse" : "flex-row")}>
          <div
            className={cn(
              "overflow-hidden shadow-sm",
              bubbleRadius(mine, cluster),
              imageOnly ? "p-0.5" : "px-3.5 py-2",
              mine
                ? "bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-800 text-white shadow-emerald-950/20"
                : light
                  ? "border border-zinc-200/90 bg-white text-zinc-900 shadow-zinc-950/5 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
                  : "border border-white/20 bg-white/14 text-emerald-50 backdrop-blur-[2px]"
            )}
          >
            {attachmentUrl ? (
              <a
                href={attachmentUrl}
                target="_blank"
                rel="noreferrer"
                className={cn("block overflow-hidden", imageOnly ? "rounded-[1rem]" : "mb-2 rounded-xl")}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={attachmentUrl} alt="Załącznik" className="max-h-56 w-full object-cover" />
              </a>
            ) : null}
            {text ? <p className="whitespace-pre-wrap break-words text-[0.925rem] leading-relaxed">{text}</p> : null}
          </div>

          {onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              className={cn(
                "mb-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition",
                light
                  ? "bg-zinc-100 text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                  : "bg-black/25 text-emerald-50/80 hover:bg-red-500/25 hover:text-red-200",
                deleting && "opacity-60"
              )}
              aria-label="Usuń wiadomość"
              title="Usuń wiadomość"
            >
              {deleting ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              )}
            </button>
          ) : null}
        </div>

        {showMeta ? (
          <p
            className={cn(
              "mt-1 px-1 text-[10px] tabular-nums",
              light ? "text-zinc-500 dark:text-zinc-400" : "text-emerald-100/55"
            )}
          >
            {timeLabel}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** Wspólny obszar rozmowy — tło jak w Messengerze, w kolorach Akademii. */
export function ChatTranscript({
  children,
  className,
  tone = "pitch",
  empty,
}: {
  children?: ReactNode;
  className?: string;
  tone?: ChatTone;
  empty?: ReactNode;
}) {
  const light = tone === "light";
  return (
    <div
      className={cn(
        "awp-chat-transcript relative overflow-y-auto overscroll-contain",
        light
          ? "rounded-2xl border border-emerald-200/70 bg-gradient-to-b from-emerald-50/90 via-white to-zinc-50 dark:border-emerald-900/40 dark:from-emerald-950/50 dark:via-zinc-950 dark:to-zinc-950"
          : "rounded-2xl border border-white/15 bg-gradient-to-b from-emerald-950/80 via-emerald-900/55 to-emerald-950/90",
        className
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 12% 18%, rgba(245,197,24,0.55), transparent 42%), radial-gradient(circle at 88% 78%, rgba(0,166,81,0.45), transparent 46%)",
        }}
        aria-hidden
      />
      <div className="relative z-[1] flex min-h-full flex-col px-3 py-3 sm:px-4">
        {empty ? <div className="flex flex-1 items-center justify-center py-8">{empty}</div> : children}
      </div>
    </div>
  );
}

/** Pasek kompozytora w stylu Messengera (pill + akcje). */
export function ChatComposerShell({
  children,
  className,
  tone = "pitch",
}: {
  children: ReactNode;
  className?: string;
  tone?: ChatTone;
}) {
  const light = tone === "light";
  return (
    <div
      className={cn(
        "flex items-end gap-1.5 rounded-2xl border p-1.5 sm:gap-2 sm:p-2",
        light
          ? "border-zinc-200 bg-zinc-100/90 dark:border-zinc-700 dark:bg-zinc-900/80"
          : "border-white/15 bg-black/20",
        className
      )}
    >
      {children}
    </div>
  );
}

export function ChatComposerField({
  id,
  value,
  onChange,
  placeholder,
  disabled,
  rows = 1,
  fieldRef,
  className,
  tone = "pitch",
  onKeyDown,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  fieldRef?: Ref<HTMLTextAreaElement>;
  className?: string;
  tone?: ChatTone;
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
}) {
  const light = tone === "light";
  return (
    <textarea
      id={id}
      ref={fieldRef}
      value={value}
      rows={rows}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      className={cn(
        "max-h-36 min-h-[2.5rem] flex-1 resize-none rounded-2xl border-0 bg-transparent px-3 py-2.5 text-sm leading-relaxed outline-none focus-visible:ring-0",
        light
          ? "text-zinc-900 placeholder:text-zinc-400 dark:text-zinc-50 dark:placeholder:text-zinc-500"
          : "text-white placeholder:text-emerald-100/45",
        className
      )}
    />
  );
}

/** Pomocniczo: wylicza klaster Messenger dla listy wiadomości. */
export function chatClusterForIndex<T extends { mine: boolean; senderKey?: string }>(
  items: T[],
  index: number
): ChatCluster {
  const cur = items[index];
  const prev = items[index - 1];
  const next = items[index + 1];
  const same = (a?: T, b?: T) =>
    Boolean(a && b && a.mine === b.mine && (a.senderKey ?? "") === (b.senderKey ?? ""));
  const withPrev = same(prev, cur);
  const withNext = same(cur, next);
  if (withPrev && withNext) return "middle";
  if (withPrev) return "end";
  if (withNext) return "start";
  return "single";
}

export function insertEmojiAtCursor(
  value: string,
  emoji: string,
  textarea: HTMLTextAreaElement | null
): string {
  if (!textarea) return `${value}${emoji}`;
  const start = textarea.selectionStart ?? value.length;
  const end = textarea.selectionEnd ?? value.length;
  const next = `${value.slice(0, start)}${emoji}${value.slice(end)}`;
  requestAnimationFrame(() => {
    const pos = start + emoji.length;
    textarea.focus();
    textarea.setSelectionRange(pos, pos);
  });
  return next;
}
