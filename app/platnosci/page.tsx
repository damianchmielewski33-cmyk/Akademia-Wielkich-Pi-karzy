import type { Metadata } from "next";
import { getServerSession } from "@/lib/auth";
import { PlatnosciClient } from "@/components/platnosci-client";

export const metadata: Metadata = {
  title: "Płatności",
  description: "Saldo portfela zawodnika lub zarządzanie saldami przez administratora.",
};

export default async function PlatnosciPage() {
  const session = await getServerSession();

  return (
    <PlatnosciClient
      isLoggedIn={Boolean(session)}
      isAdmin={session?.isAdmin ?? false}
    />
  );
}
