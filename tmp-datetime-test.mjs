import Database from "better-sqlite3";

const db = new Database(":memory:");
const fromIso = "2026-08-04T22:00:00.000Z"; // start of 2026-08-05 Warsaw (CEST)
const toIso = "2026-08-05T21:59:59.999Z"; // end of that day

db.exec("CREATE TABLE t (ts TEXT)");
const samples = [
  "2026-08-05 12:00:00", // SQLite datetime('now') style (UTC wall if server UTC)
  "2026-08-05T12:00:00.000Z",
  "2026-08-04 23:00:00",
  "2026-08-04T21:59:59.999Z",
  "2026-08-04T22:00:00.000Z",
  "2026-08-05T21:59:59.999Z",
  "2026-08-05T22:00:00.000Z",
];
for (const ts of samples) db.prepare("INSERT INTO t VALUES (?)").run(ts);

console.log("datetime() comparisons:");
for (const row of db.prepare("SELECT ts FROM t").all()) {
  const r = db
    .prepare(
      `SELECT ? AS ts,
              datetime(?) AS dts,
              datetime(?) AS fromD,
              datetime(?) AS toD,
              (datetime(?) >= datetime(?) AND datetime(?) <= datetime(?)) AS inRange`
    )
    .get(row.ts, row.ts, fromIso, toIso, row.ts, fromIso, row.ts, toIso);
  console.log(r);
}

console.log("\nstring compare ISO:");
for (const ts of samples.filter((s) => s.includes("T"))) {
  console.log(ts, ts >= fromIso && ts <= toIso);
}

console.log("\ndatetime() of ISO:");
for (const iso of [fromIso, toIso, "2026-08-05T12:00:00.000Z"]) {
  console.log(iso, "->", db.prepare("SELECT datetime(?) AS d").get(iso));
}
