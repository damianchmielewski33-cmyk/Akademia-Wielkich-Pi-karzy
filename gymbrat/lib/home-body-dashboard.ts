import { asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { bodyReportPhotos, bodyReports, users, weightLogs } from "@/db/schema";
import { maybeDecryptSensitiveField } from "@/lib/app-field-crypto";

export type MetricPoint = { date: string; value: number };

export type HomeBodyDashboard = {
  displayName: string;
  currentWeightKg: number | null;
  startWeightKg: number | null;
  weightDeltaFromStartKg: number | null;
  weightTrend: "up" | "down" | "flat" | null;
  weeklyTempoKg: number | null;
  series: {
    weight: MetricPoint[];
    waist: MetricPoint[];
    chest: MetricPoint[];
    thigh: MetricPoint[];
    biceps: MetricPoint[];
  };
  transformationPhotos: { id: string; dataUrl: string; label: string; date: string }[];
  spark: {
    waist: MetricPoint[];
    chest: MetricPoint[];
    thigh: MetricPoint[];
    biceps: MetricPoint[];
  };
};

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function mergeWeightSeries(
  fromLogs: { date: string; value: number }[],
  fromReports: { date: string; value: number }[],
): MetricPoint[] {
  const byDay = new Map<string, number>();
  for (const p of fromReports) byDay.set(p.date, p.value);
  for (const p of fromLogs) byDay.set(p.date, p.value);
  return Array.from(byDay.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, value]) => ({ date, value: round1(value) }));
}

export async function getHomeBodyDashboard(userId: string): Promise<HomeBodyDashboard> {
  const db = getDb();

  const [[userRow], reportRows, weighIns] = await Promise.all([
    db
      .select({
        name: users.name,
        firstName: users.firstName,
        lastName: users.lastName,
        weightKg: users.weightKg,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),
    db
      .select({
        id: bodyReports.id,
        createdAt: bodyReports.createdAt,
        weightKg: bodyReports.weightKg,
        waistCm: bodyReports.waistCm,
        chestCm: bodyReports.chestCm,
        thighCm: bodyReports.thighCm,
        bicepsCm: bodyReports.bicepsCm,
      })
      .from(bodyReports)
      .where(eq(bodyReports.userId, userId))
      .orderBy(asc(bodyReports.createdAt), asc(bodyReports.id))
      .limit(120),
    db
      .select({
        recordedAt: weightLogs.recordedAt,
        weightKg: weightLogs.weightKg,
      })
      .from(weightLogs)
      .where(eq(weightLogs.userId, userId))
      .orderBy(asc(weightLogs.recordedAt))
      .limit(200),
  ]);

  const displayName =
    [userRow?.firstName, userRow?.lastName].filter(Boolean).join(" ").trim() ||
    userRow?.name?.trim() ||
    "zawodniku";

  const weightFromLogs = weighIns
    .filter((w) => w.weightKg != null && Number.isFinite(Number(w.weightKg)))
    .map((w) => ({ date: dayKey(w.recordedAt), value: Number(w.weightKg) }));

  const weightFromReports = reportRows
    .filter((r) => r.weightKg != null && Number.isFinite(Number(r.weightKg)))
    .map((r) => ({ date: dayKey(r.createdAt), value: Number(r.weightKg) }));

  const weight = mergeWeightSeries(weightFromLogs, weightFromReports);

  function seriesFromReports(
    pick: (r: (typeof reportRows)[number]) => number | null | undefined,
  ): MetricPoint[] {
    return reportRows
      .map((r) => {
        const v = pick(r);
        if (v == null || !Number.isFinite(Number(v))) return null;
        return { date: dayKey(r.createdAt), value: round1(Number(v)) };
      })
      .filter((p): p is MetricPoint => p != null);
  }

  const waist = seriesFromReports((r) => r.waistCm);
  const chest = seriesFromReports((r) => r.chestCm);
  const thigh = seriesFromReports((r) => r.thighCm);
  const biceps = seriesFromReports((r) => r.bicepsCm);

  const profileWeight =
    userRow?.weightKg != null && Number.isFinite(Number(userRow.weightKg))
      ? Number(userRow.weightKg)
      : null;

  const currentWeightKg =
    weight.length > 0 ? weight[weight.length - 1]!.value : profileWeight;
  const startWeightKg = weight.length > 0 ? weight[0]!.value : profileWeight;

  const weightDeltaFromStartKg =
    currentWeightKg != null && startWeightKg != null
      ? round1(currentWeightKg - startWeightKg)
      : null;

  let weightTrend: HomeBodyDashboard["weightTrend"] = null;
  if (weight.length >= 2) {
    const prev = weight[weight.length - 2]!.value;
    const last = weight[weight.length - 1]!.value;
    const d = last - prev;
    weightTrend = Math.abs(d) < 0.05 ? "flat" : d > 0 ? "up" : "down";
  } else if (weightDeltaFromStartKg != null) {
    weightTrend =
      Math.abs(weightDeltaFromStartKg) < 0.05
        ? "flat"
        : weightDeltaFromStartKg > 0
          ? "up"
          : "down";
  }

  let weeklyTempoKg: number | null = null;
  if (weight.length >= 2 && currentWeightKg != null && startWeightKg != null) {
    const t0 = new Date(`${weight[0]!.date}T12:00:00`).getTime();
    const t1 = new Date(`${weight[weight.length - 1]!.date}T12:00:00`).getTime();
    const weeks = Math.max((t1 - t0) / (7 * 24 * 60 * 60 * 1000), 1 / 7);
    weeklyTempoKg = round1((currentWeightKg - startWeightKg) / weeks);
  }

  const reportIds = reportRows.map((r) => r.id);
  const photosByReport = new Map<string, { id: string; dataUrl: string }[]>();
  if (reportIds.length > 0) {
    const allPhotos = await db
      .select()
      .from(bodyReportPhotos)
      .where(
        reportIds.length === 1
          ? eq(bodyReportPhotos.reportId, reportIds[0]!)
          : inArray(bodyReportPhotos.reportId, reportIds),
      );

    for (const p of allPhotos) {
      const url = maybeDecryptSensitiveField(p.dataUrl);
      if (!url) continue;
      const arr = photosByReport.get(p.reportId) ?? [];
      arr.push({ id: p.id, dataUrl: url });
      photosByReport.set(p.reportId, arr);
    }
  }

  const withPhotos = reportRows.filter((r) => (photosByReport.get(r.id)?.length ?? 0) > 0);
  const firstWithPhotos = withPhotos[0] ?? null;
  const lastWithPhotos = withPhotos.length > 0 ? withPhotos[withPhotos.length - 1]! : null;

  const transformationPhotos: HomeBodyDashboard["transformationPhotos"] = [];
  if (firstWithPhotos) {
    for (const p of photosByReport.get(firstWithPhotos.id) ?? []) {
      transformationPhotos.push({
        id: `first-${p.id}`,
        dataUrl: p.dataUrl,
        label: "Start",
        date: dayKey(firstWithPhotos.createdAt),
      });
    }
  }
  if (lastWithPhotos && lastWithPhotos.id !== firstWithPhotos?.id) {
    for (const p of photosByReport.get(lastWithPhotos.id) ?? []) {
      transformationPhotos.push({
        id: `now-${p.id}`,
        dataUrl: p.dataUrl,
        label: "Teraz",
        date: dayKey(lastWithPhotos.createdAt),
      });
    }
  } else if (
    lastWithPhotos &&
    firstWithPhotos &&
    lastWithPhotos.id === firstWithPhotos.id &&
    transformationPhotos.length === 0
  ) {
    for (const p of photosByReport.get(lastWithPhotos.id) ?? []) {
      transformationPhotos.push({
        id: `now-${p.id}`,
        dataUrl: p.dataUrl,
        label: "Aktualne",
        date: dayKey(lastWithPhotos.createdAt),
      });
    }
  }

  const sparkTail = (arr: MetricPoint[]) => arr.slice(-12);

  return {
    displayName,
    currentWeightKg,
    startWeightKg,
    weightDeltaFromStartKg,
    weightTrend,
    weeklyTempoKg,
    series: { weight, waist, chest, thigh, biceps },
    transformationPhotos,
    spark: {
      waist: sparkTail(waist),
      chest: sparkTail(chest),
      thigh: sparkTail(thigh),
      biceps: sparkTail(biceps),
    },
  };
}
