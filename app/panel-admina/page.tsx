import type { Metadata } from "next";
import { AdminPanel } from "@/components/admin-panel";

export const metadata: Metadata = {
  title: "Panel admina",
  description: "Zarządzanie meczami, użytkownikami i składami.",
  robots: { index: false, follow: false },
};

export default function PanelAdminaPage() {
  return <AdminPanel />;
}
