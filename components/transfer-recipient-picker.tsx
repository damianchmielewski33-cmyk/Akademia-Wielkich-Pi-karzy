"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

export type TransferRecipient = {
  id: number;
  first_name: string;
  last_name: string;
  zawodnik: string;
  profile_photo_path: string | null;
};

type Props = {
  id?: string;
  label?: string;
  excludeUserId: number | null;
  selectedId: number | null;
  onSelect: (player: TransferRecipient | null) => void;
  disabled?: boolean;
  error?: string;
  className?: string;
};

function playerLabel(p: TransferRecipient): string {
  const name = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
  if (name && p.zawodnik) return `${name} (${p.zawodnik})`;
  return name || p.zawodnik || `Gracz #${p.id}`;
}

/**
 * Autocomplete odbiorcy przelewu — UX jak PlayerAliasPicker, źródło: zawodnicy akademii.
 */
export function TransferRecipientPicker({
  id: idProp,
  label = "Odbiorca",
  excludeUserId,
  selectedId,
  onSelect,
  disabled,
  error,
  className,
}: Props) {
  const genId = useId();
  const inputId = idProp ?? `transfer-recipient-${genId}`;
  const listId = `${inputId}-suggestions`;
  const wrapRef = useRef<HTMLDivElement>(null);

  const [players, setPlayers] = useState<TransferRecipient[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingList(true);
    void (async () => {
      try {
        const res = await fetch("/api/players");
        const data = (await res.json().catch(() => ({}))) as { players?: TransferRecipient[] };
        if (cancelled) return;
        setPlayers(Array.isArray(data.players) ? data.players : []);
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = useMemo(
    () => (selectedId == null ? null : players.find((p) => p.id === selectedId) ?? null),
    [players, selectedId]
  );

  useEffect(() => {
    if (selected) setQuery(playerLabel(selected));
  }, [selected]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return players
      .filter((p) => excludeUserId == null || p.id !== excludeUserId)
      .filter((p) => {
        if (q.length < 1) return true;
        const hay = `${p.first_name} ${p.last_name} ${p.zawodnik}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 12);
  }, [players, excludeUserId, query]);

  const clearIfMismatch = useCallback(() => {
    if (!selected) return;
    if (query.trim() !== playerLabel(selected)) {
      onSelect(null);
    }
  }, [onSelect, query, selected]);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
        clearIfMismatch();
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [clearIfMismatch]);

  return (
    <FormField
      id={inputId}
      label={label}
      required
      hint={error ? undefined : "Wybierz zawodnika akademii z podpowiedzi."}
      error={error}
      className={className}
    >
      <div ref={wrapRef} className="relative">
        <Input
          value={query}
          disabled={disabled}
          required
          placeholder="Szukaj po imieniu, nazwisku lub awatarze…"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (selectedId != null) onSelect(null);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            window.setTimeout(() => clearIfMismatch(), 0);
          }}
        />
        {open && !disabled ? (
          <ul
            id={listId}
            className="absolute z-50 mt-1 max-h-52 w-full overflow-auto rounded-xl border border-emerald-950/12 bg-white py-1 text-sm shadow-lg shadow-emerald-950/10 dark:border-emerald-800/60 dark:bg-zinc-900"
          >
            {loadingList ? (
              <li className="px-3 py-2 text-zinc-500">Wczytywanie zawodników…</li>
            ) : filtered.length === 0 ? (
              <li className="px-3 py-2 text-zinc-500">Brak wyników</li>
            ) : (
              filtered.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onSelect(p);
                      setQuery(playerLabel(p));
                      setOpen(false);
                    }}
                  >
                    {playerLabel(p)}
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>
    </FormField>
  );
}
