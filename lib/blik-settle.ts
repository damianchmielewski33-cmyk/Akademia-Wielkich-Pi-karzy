export type BlikSettleOutcome = "not_received" | "underpaid" | "received" | "overpaid";

export function roundBlikPln(n: number): number {
  return Math.round(n * 100) / 100;
}

export function parseBlikAmountInput(raw: string): number | null {
  const n = Number.parseFloat(raw.replace(",", ".").replace(/\s/g, ""));
  if (!Number.isFinite(n)) return null;
  return roundBlikPln(n);
}

export function blikContributionCovered(receivedPln: number, contributionPln: number): boolean {
  return roundBlikPln(receivedPln) + 0.0001 >= roundBlikPln(contributionPln);
}

export function resolveBlikReceivedPln(args: {
  outcome: BlikSettleOutcome;
  contributionPln: number;
  receivedPln?: number | null;
}): { ok: true; receivedPln: number } | { ok: false; error: string } {
  const contribution = roundBlikPln(args.contributionPln);
  if (!(contribution > 0)) {
    return { ok: false, error: "Brak kwoty składki" };
  }

  if (args.outcome === "not_received") {
    return { ok: true, receivedPln: 0 };
  }

  if (args.outcome === "received") {
    const received =
      args.receivedPln != null && Number.isFinite(args.receivedPln)
        ? roundBlikPln(args.receivedPln)
        : contribution;
    if (received <= 0) return { ok: false, error: "Podaj kwotę przelewu" };
    if (received > 10_000) return { ok: false, error: "Kwota nie może przekroczyć 10 000 PLN" };
    return { ok: true, receivedPln: received };
  }

  const received = roundBlikPln(Number(args.receivedPln));
  if (!Number.isFinite(received) || received <= 0) {
    return { ok: false, error: "Podaj otrzymaną kwotę" };
  }
  if (received > 10_000) return { ok: false, error: "Kwota nie może przekroczyć 10 000 PLN" };

  if (args.outcome === "underpaid") {
    if (received >= contribution) {
      return { ok: false, error: "Za mała wpłata musi być niższa niż składka" };
    }
    return { ok: true, receivedPln: received };
  }

  if (received <= contribution) {
    return { ok: false, error: "Nadpłata musi być wyższa niż składka" };
  }
  return { ok: true, receivedPln: received };
}
