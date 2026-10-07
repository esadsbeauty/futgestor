import { ParticipantList } from "@/components/futgestor/participant-list";
import { listPlayerInvites } from "@/lib/queries/invites";
import { ensureCurrentMonthFees, getCurrentOrganizationForUser, getParticipants } from "@/lib/queries/participants";

export const dynamic = "force-dynamic";

export default async function ParticipantsPage() {
  const organization = await getCurrentOrganizationForUser();
  if (organization.billing_mode !== "per_game") await ensureCurrentMonthFees(organization.id);
  const [participants, invites] = await Promise.all([
    getParticipants(organization.id, undefined, organization.billing_mode),
    listPlayerInvites(organization.id),
  ]);
  return <ParticipantList organization={organization} participants={participants} invites={invites}/>;
}
