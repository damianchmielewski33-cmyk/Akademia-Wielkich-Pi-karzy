import { describe, expect, it } from "vitest";
import { buildTerminarzIcs, escapeIcsText } from "@/lib/calendar-ics";
import type { MatchRow } from "@/lib/db";

describe("escapeIcsText", () => {
  it("escapes special characters per RFC 5545", () => {
    expect(escapeIcsText("a\\b")).toBe("a\\\\b");
    expect(escapeIcsText("a;b,c")).toBe("a\\;b\\,c");
    expect(escapeIcsText("line1\nline2")).toBe("line1\\nline2");
  });
});

describe("buildTerminarzIcs", () => {
  it("produces a minimal valid calendar with one event", () => {
    const m: MatchRow = {
      id: 1,
      match_date: "2026-04-10",
      match_time: "18:00",
      location: "Boisko; Test",
      max_slots: 14,
      signed_up: 10,
      played: 0,
      lineup_public: 0,
    };
    const ics = buildTerminarzIcs([m], "Test Cal");
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("DTSTART:20260410T180000");
    expect(ics).toContain("UID:awp-m1@terminarz.local");
  });
});
