import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminPanel } from "@/components/admin-panel";
import { getServerSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Panel admina",
  description: "Zarządzanie meczami, użytkownikami i składami.",
  robots: { index: false, follow: false },
};

export default async function PanelAdminaPage() {
  const session = await getServerSession();
  if (!session?.isAdmin) {
    redirect("/login?next=/panel-admina");
  }
  if (session.needsPinSetup) {
    redirect("/ustaw-pin?next=/panel-admina");
  }
  if (session.pinChangePending) {
    redirect("/login?next=/panel-admina");
  }
  return <AdminPanel />;
}
