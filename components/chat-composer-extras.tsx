"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Smile, X } from "lucide-react";
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

type EmojiPickerProps = {
  onPick: (emoji: string) => void;
  disabled?: boolean;
  className?: string;
};

export function ChatEmojiPicker({ onPick, disabled, className }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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
        className="h-9 w-9 text-emerald-100/85 hover:bg-white/10 hover:text-white"
        aria-label="Emotki"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Smile className="h-5 w-5" aria-hidden />
      </Button>
      {open ? (
        <div
          className="absolute bottom-[calc(100%+0.4rem)] left-0 z-50 w-[min(17.5rem,calc(100vw-2rem))] rounded-2xl border border-white/20 bg-emerald-950/95 p-2 shadow-xl backdrop-blur-md"
          role="listbox"
          aria-label="Lista emotek"
        >
          <div className="grid grid-cols-8 gap-0.5">
            {CHAT_EMOJI_LIST.map((emoji) => (
              <button
                key={emoji}
                type="button"
                role="option"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-lg transition-colors hover:bg-white/15"
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
};

export function ChatAttachmentControls({
  disabled,
  attachmentUrl,
  previewUrl,
  onUploaded,
  onClear,
  onUploadingChange,
}: AttachmentBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

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
        className="h-9 w-9 text-emerald-100/85 hover:bg-white/10 hover:text-white"
        aria-label="Dołącz grafikę"
        onClick={() => inputRef.current?.click()}
      >
        <ImagePlus className="h-5 w-5" aria-hidden />
      </Button>
      {attachmentUrl && previewUrl ? (
        <div className="relative h-12 w-12 overflow-hidden rounded-lg border border-white/25">
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
        <span className="text-xs text-emerald-100/70">Wgrywanie…</span>
      ) : null}
    </div>
  );
}

type BubbleProps = {
  body: string;
  attachmentUrl?: string | null;
  senderLabel?: string | null;
  timeLabel: string;
  mine: boolean;
};

export function ChatBubble({ body, attachmentUrl, senderLabel, timeLabel, mine }: BubbleProps) {
  const text = body.trim();
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm",
          mine ? "bg-emerald-700 text-white" : "border border-white/20 bg-white/10 text-emerald-50"
        )}
      >
        {senderLabel ? (
          <p className="mb-1 text-[11px] font-semibold text-[var(--mundial-gold)]">{senderLabel}</p>
        ) : null}
        {attachmentUrl ? (
          <a href={attachmentUrl} target="_blank" rel="noreferrer" className="mb-2 block overflow-hidden rounded-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={attachmentUrl}
              alt="Załącznik"
              className="max-h-56 w-full object-cover"
            />
          </a>
        ) : null}
        {text ? <p className="whitespace-pre-wrap break-words leading-relaxed">{text}</p> : null}
        <p className={cn("mt-1 text-[10px]", mine ? "text-emerald-100/80" : "text-emerald-100/50")}>{timeLabel}</p>
      </div>
    </div>
  );
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
