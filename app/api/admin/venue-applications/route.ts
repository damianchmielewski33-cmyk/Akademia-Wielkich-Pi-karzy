import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";
import { getDb } from "@/lib/db";
import { listVenueApplications } from "@/lib/venue-applications";

export const runtime = "nodejs";

export async function GET() {
  const gate = await requireAdmin("matches");
  if (!gate.ok) return gate.response;
  const db = await getDb();
  const applications = await listVenueApplications(db);
  return NextResponse.json({ applications });
}
