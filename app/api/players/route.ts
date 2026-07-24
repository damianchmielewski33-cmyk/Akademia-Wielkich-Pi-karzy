import { NextResponse } from "next/server";
import { REALMS } from "@/lib/realm";
import { getPilkarzePageData } from "@/lib/realm-page-data";

export const runtime = "nodejs";

export async function GET() {
  const players = await getPilkarzePageData(REALMS.ACADEMY);
  return NextResponse.json({ players });
}
