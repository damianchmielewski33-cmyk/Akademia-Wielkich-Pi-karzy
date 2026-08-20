import type { Metadata } from "next";
import { ClubOwnerLanding } from "@/components/club-owner-landing";
import { redirectIfBookingMarketplaceDisabled } from "@/lib/booking-marketplace";

export const metadata: Metadata = {
  title: "Dla obiektów — zgłoś halę",
  description:
    "Zgłoś orlik albo halę bez tokenu zaproszenia. Weryfikacja, publikacja, rezerwacje online, prowizja 15%, przelew w 7 dni.",
};

export default async function ForVenuesPage() {
  await redirectIfBookingMarketplaceDisabled();
  return <ClubOwnerLanding />;
}
