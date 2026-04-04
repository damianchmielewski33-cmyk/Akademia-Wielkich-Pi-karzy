import { ConfirmPlayedClient } from "@/components/confirm-played-client";

type Props = { params: Promise<{ id: string }> };

export default async function ConfirmPlayedPage({ params }: Props) {
  const { id } = await params;
  return <ConfirmPlayedClient matchId={id} />;
}
