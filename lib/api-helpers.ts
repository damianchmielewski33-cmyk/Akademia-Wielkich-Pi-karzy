import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";

export async function requireUser() {
  const session = await getServerSession();
  if (!session) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true as const, session };
}

export async function requireAdmin() {
  const r = await requireUser();
  if (!r.ok) return r;
  if (!r.session.isAdmin) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { ok: true as const, session: r.session };
}
