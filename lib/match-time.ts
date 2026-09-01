export function matchStartDate(m: { match_date: string; match_time: string }): Date {
  const t = m.match_time.trim();
  const timePart = t.length === 5 ? `${t}:00` : t;
  return new Date(`${m.match_date}T${timePart}`);
}

/** True gdy minął planowany start meczu (data + godzina w strefie przeglądarki). */
export function hasMatchTimePassed(m: { match_date: string; match_time: string }): boolean {
  return Date.now() >= matchStartDate(m).getTime();
}
