import { getServerSession } from "@/lib/auth";
import { PartnerInviteClient } from "@/components/partner-invite-client";

export const metadata = {
  title: "Zaproszenie partnera",
  description: "Aktywuj panel i zarządzaj swoim obiektem, cennikiem i terminami.",
};

export default async function PartnerInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await getServerSession();
  const loggedIn = Boolean(session && !session.needsPinSetup && !session.pinChangePending);
  return <PartnerInviteClient token={token} isLoggedIn={loggedIn} />;
}
