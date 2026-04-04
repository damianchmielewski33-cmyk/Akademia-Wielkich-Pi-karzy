import { redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

/** Stary link z szablonu Flask – przekierowanie do terminarza. */
export default async function PlayersLegacyPage({ params }: Props) {
  const { id } = await params;
  redirect(`/terminarz?lista=${id}`);
}
