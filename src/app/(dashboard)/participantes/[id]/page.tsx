import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { FeeHistory } from "@/components/futgestor/fee-history";
import { ParticipantProfile } from "@/components/futgestor/participant-profile";
import { ParticipantSummary } from "@/components/futgestor/participant-summary";
import { PayFeeButton } from "@/components/futgestor/pay-fee-button";
import { PlayerAccessCard } from "@/components/futgestor/player-access-card";
import { StatusBadge } from "@/components/futgestor/status-badge";
import { participantMonthStatus } from "@/lib/finance";
import { formatMonthYear } from "@/lib/formatters";
import { currentReferenceMonth, ensureCurrentMonthFees, getCurrentOrganizationForUser, getParticipantById, getParticipantFees, getParticipantSummary } from "@/lib/queries/participants";
import { getParticipantAccess } from "@/lib/queries/player-portal";

export const dynamic = "force-dynamic";
export default async function ParticipantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const organization = await getCurrentOrganizationForUser();
  const participant = await getParticipantById(organization.id, id);
  if (organization.billing_mode !== "per_game") await ensureCurrentMonthFees(organization.id);
  const [fees, access] = await Promise.all([getParticipantFees(organization.id, participant.id), getParticipantAccess(organization.id, participant.id)]);
  const referenceMonth = currentReferenceMonth();
  const currentFee = fees.find((fee) => fee.reference_month === referenceMonth) ?? null;
  const currentStatus = participantMonthStatus(participant.status, currentFee, new Date(), organization.billing_mode, participant.billing_type);
  const summary = getParticipantSummary(fees);
  return <div className="mx-auto max-w-5xl">
    <Link href="/participantes" className="focus-ring inline-flex items-center gap-2 rounded-lg text-sm text-[var(--muted)] hover:text-white"><ArrowLeft size={17}/>Voltar para participantes</Link>
    <ParticipantProfile organization={organization} participant={participant}/>
    <PlayerAccessCard key={participant.user_id ?? access?.id ?? "without-access"} playerId={participant.id} access={access} hasAccount={Boolean(participant.user_id)}/>
    <section className="card mt-5 flex flex-col gap-4 p-5 sm:flex-row sm:items-center"><div className="flex-1"><p className="text-sm text-[var(--muted)]">Situação do mês atual</p><div className="mt-2 flex flex-wrap items-center gap-3"><h2 className="text-lg font-bold">{formatMonthYear(referenceMonth)}</h2><StatusBadge status={currentStatus}/></div>{!currentFee && participant.status === "inactive" && <p className="mt-2 text-xs text-[var(--muted)]">Participantes inativos não recebem novas mensalidades.</p>}{currentStatus === "per_game" && <p className="mt-2 text-xs text-[var(--muted)]">Este participante não recebe mensalidade fixa.</p>}</div>{currentFee && currentStatus !== "paid" && currentStatus !== "per_game" && <PayFeeButton feeId={currentFee.id} participantId={participant.id}/>}</section>
    <ParticipantSummary summary={summary}/>
    <FeeHistory fees={fees} participantId={participant.id}/>
  </div>;
}
