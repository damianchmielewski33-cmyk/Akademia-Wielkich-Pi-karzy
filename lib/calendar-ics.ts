import type { MatchRow } from "@/lib/db";

/** Escapowanie tekstu w polach iCalendar (RFC 5545). */
export function escapeIcsText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatUtcStamp(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}T` +
    `${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}Z`
  );
}

/** Czas lokalny „floating” YYYYMMDDTHHMMSS (bez strefy) — typowe dla drużynowych terminów. */
function matchLocalDateTime(matchDate: string, matchTime: string): string {
  const datePart = matchDate.replace(/-/g, "");
  const raw = matchTime.trim();
  const hm = raw.length >= 5 ? raw.slice(0, 5) : "00:00";
  const [h, m] = hm.split(":");
  const hh = pad2(Number.parseInt(h || "0", 10) || 0);
  const mm = pad2(Number.parseInt(m || "0", 10) || 0);
  return `${datePart}T${hh}${mm}00`;
}

export function buildTerminarzIcs(matches: MatchRow[], calName: string): string {
  const now = new Date();
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AWP//Terminarz//PL",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${escapeIcsText(calName)}`,
  ];
  for (const m of matches) {
    const uid = `awp-m${m.id}@terminarz.local`;
    const dtStart = matchLocalDateTime(m.match_date, m.match_time);
    const summary = `Mecz — ${m.location}`;
    const desc = `Lokalizacja: ${m.location}. Zapisy: ${m.signed_up}/${m.max_slots}.`;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${formatUtcStamp(now)}`,
      `DTSTART:${dtStart}`,
      `SUMMARY:${escapeIcsText(summary)}`,
      `DESCRIPTION:${escapeIcsText(desc)}`,
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
