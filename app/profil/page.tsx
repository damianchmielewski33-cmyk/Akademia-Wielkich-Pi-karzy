import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfilClient } from "@/components/profil-client";
import { getServerSession } from "@/lib/auth";
import { getProfileDashboard } from "@/lib/profile-data";

export const metadata: Metadata = {
  title: "Mój profil",
  description: "Edycja profilu, zdjęcia, awatara i statystyk z meczów.",
};

export default async function ProfilPage() {
  const session = await getServerSession();
  if (!session) redirect("/login?next=/profil");

  const initial = getProfileDashboard(session.userId);
  if (!initial) redirect("/login");

  return <ProfilClient initial={initial} />;
}
