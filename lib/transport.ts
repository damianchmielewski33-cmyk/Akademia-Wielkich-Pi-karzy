export type SignupTransportRow = {
  drives_car: number;
  can_take_passengers: number;
  needs_transport: number;
};

/** Osoba na liście transportowej (kierowca z miejscem albo potrzebujący dojazdu). */
export type TransportParticipantDTO = {
  userId: number;
  firstName: string;
  lastName: string;
  zawodnik: string;
  profilePhotoPath: string | null;
};

export function matchStartDate(m: { match_date: string; match_time: string }): Date {
  const t = m.match_time.trim();
  const timePart = t.length === 5 ? `${t}:00` : t;
  return new Date(`${m.match_date}T${timePart}`);
}

/** Przycisk „Transport na mecz” — od 6 h przed rozpoczęciem do momentu startu meczu. */
export function isWithinSixHoursBeforeMatch(m: { match_date: string; match_time: string }): boolean {
  const start = matchStartDate(m).getTime();
  const now = Date.now();
  const sixHours = 6 * 60 * 60 * 1000;
  return now >= start - sixHours && now < start;
}

/** Czat transportowy: kierowcy mogący zabrać pasażerów lub osoby potrzebujące dojazdu (komunikacja + potrzeba transportu). */
export function isTransportChatEligible(row: SignupTransportRow | null | undefined): boolean {
  if (!row) return false;
  if (row.drives_car === 1 && row.can_take_passengers === 1) return true;
  if (row.drives_car === 0 && row.needs_transport === 1) return true;
  return false;
}

export function normalizeTransportFromBody(input: {
  drivesCar: boolean;
  canTakePassengers?: boolean;
  needsTransport?: boolean;
}): SignupTransportRow {
  if (input.drivesCar) {
    return {
      drives_car: 1,
      can_take_passengers: input.canTakePassengers ? 1 : 0,
      needs_transport: 0,
    };
  }
  return {
    drives_car: 0,
    can_take_passengers: 0,
    needs_transport: input.needsTransport ? 1 : 0,
  };
}

export function validateTransportBody(input: {
  drivesCar: boolean;
  canTakePassengers?: boolean;
  needsTransport?: boolean;
}): string | null {
  if (input.drivesCar) {
    if (typeof input.canTakePassengers !== "boolean") {
      return "Podaj, czy możesz zabrać pasażerów (TAK/NIE).";
    }
  } else if (typeof input.needsTransport !== "boolean") {
    return "Podaj, czy potrzebujesz transportu (TAK/NIE).";
  }
  return null;
}
