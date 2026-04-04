import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";

export async function GET() {
  const s = await getServerSession();
  if (!s) return NextResponse.json({ user: null });
  return NextResponse.json({
    user: {
      id: s.userId,
      first_name: s.firstName,
      last_name: s.lastName,
      zawodnik: s.zawodnik,
      is_admin: s.isAdmin ? 1 : 0,
    },
  });
}
