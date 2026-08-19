import type { Metadata } from "next";
import { ClubOwnerLanding } from "@/components/club-owner-landing";

export const metadata: Metadata = {
  title: "Dla obiektów",
  description: "Wystaw boisko, ustaw cennik i przyjmuj rezerwacje online.",
};

export default function ForVenuesPage() {
  return <ClubOwnerLanding />;
}
