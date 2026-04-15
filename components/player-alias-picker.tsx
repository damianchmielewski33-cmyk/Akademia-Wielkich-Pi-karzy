"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  helperText?: string;
  className?: string;
  /** Dodatkowe klasy na elemencie `<input>`. */
  inputClassName?: string;
};

/**
 * Pole awatara: podpowiedzi z internetu (/api/players/search) + dowolny wpis ręczny.
 */
export function PlayerAliasPicker({
  id: idProp,
  label,
  value,
  onChange,
  disabled,
  required,
  placeholder = "Szukaj po nazwisku lub wpisz dowolnego piłkarza…",
  /** Puste `""` ukrywa podpowiedź; brak propsa — domyślny tekst pomocy. */
  helperText,
  className,
  inputClassName,
}: Props) {
  const hintText =
    helperText === undefined
      ? "Możesz wybrać z podpowiedzi albo wpisać własną nazwę — tak jak przy rejestracji."
      : helperText;
  const genId = useId();
  const inputId = idProp ?? `player-alias-${genId}`;
  const listId = `${inputId}-suggestions`;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<{ id: string; name: string }[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/players/search?q=${encodeURIComponent(q.trim())}`);
      const data = (await res.json().catch(() => ({}))) as { players?: { id: string; name: string }[] };
      setSuggestions(Array.isArray(data.players) ? data.players : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <Label htmlFor={inputId}>{label}</Label>
      <Input
        id={inputId}
        className={cn("mt-1", inputClassName)}
        value={value}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        onChange={(e) => {
          const v = e.target.value;
          onChange(v);
          setOpen(true);
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            void runSearch(v);
          }, 320);
        }}
        onFocus={() => {
          setOpen(true);
          if (value.trim().length >= 2) void runSearch(value);
        }}
      />
      {hintText ? <p className="mt-1 text-xs text-zinc-500">{hintText}</p> : null}
      {open && !disabled && (suggestions.length > 0 || loading) ? (
        <ul
          id={listId}
          className="absolute z-50 mt-1 max-h-52 w-full overflow-auto rounded-md border border-zinc-200 bg-white py-1 text-sm shadow-md dark:border-zinc-600 dark:bg-zinc-900"
        >
          {loading ? (
            <li className="px-3 py-2 text-zinc-500">Szukam…</li>
          ) : (
            suggestions.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(s.name);
                    setOpen(false);
                    setSuggestions([]);
                  }}
                >
                  {s.name}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
