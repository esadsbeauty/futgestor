import { PlayerAccountView } from "@/components/futgestor/player-account-view";
import { getMyPlayerAccount } from "@/lib/queries/player-account";

export const dynamic = "force-dynamic";

export default async function MyGroupPage() {
  const data = await getMyPlayerAccount();
  return <PlayerAccountView data={data} />;
}
