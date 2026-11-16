import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { FeeHistory } from "@/components/futgestor/fee-history";
import { ParticipantProfile } from "@/components/futgestor/participant-profile";
import { ParticipantDeleteButton } from "@/components/futgestor/participant-delete-button";
import { ParticipantSummary } from "@/components/futgestor/participant-summary";
import { PayFeeButton } from "@/components/futgestor/pay-fee-button";
import { PlayerAccessCard } from "@/components/futgestor/player-access-card";
import { StatusBadge } from "@/components/futgestor/status-badge";
import { participantMonthStatus } from "@/lib/finance";
import { formatDate, formatMonthYear } from "@/lib/formatters";
import { currentReferenceMonth, ensureCurrentMonthFees, getCurrentOrganizationForUser, getParticipantById, getParticipantFees, getParticipantGameHistory, getParticipantSummary } from "@/lib/queries/participants";
import { getParticipantAccess } from "@/lib/queries/player-portal";

export const dynamic = "force-dynamic";

const positionLabels: Record<string, string> = {
  goalkeeper: "Goleiro",
  fixed: "Fixo",
  winger: "Ala / Ponta",
  pivot: "Pivô",
  full_back: "Lateral",
  center_back: "Zagueiro",
  defensive_mid: "Volante",
  midfielder: "Meio-campo",
  striker: "Atacante",
  other: "Outra",
};
export default async function ParticipantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const organization = await getCurrentOrganizationForUser();
  const participant = await getParticipantById(organization.id, id);
  if (organization.billing_mode !== "per_game") await ensureCurrentMonthFees(organization.id);
  const [fees, access, gameHistory] = await Promise.all([
    getParticipantFees(organization.id, participant.id),
    getParticipantAccess(organization.id, participant.id),
    getParticipantGameHistory(organization.id, participant.id),
  ]);
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
    <section className="mt-8">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[var(--brand)]">Histórico esportivo</p>
        <h2 className="mt-2 text-xl font-black">Jogos do participante</h2>
      </div>
      <div className="mt-4 grid gap-3">
        {gameHistory.length ? gameHistory.map((game) => (
          <article key={game.game_id} className="card p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-bold">{game.title}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {game.game_date ? formatDate(game.game_date) : "Data não disponível"}
                  {game.start_time ? ` · ${game.start_time.slice(0, 5)}` : ""}
                </p>
              </div>
              <span className="rounded-full bg-white/[.04] px-2.5 py-1 text-[10px] font-bold text-[var(--muted)]">
                {game.status === "canceled" ? "Cancelado" : game.status === "completed" ? "Finalizado" : "Agendado"}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[var(--border)] pt-4 sm:grid-cols-4">
              <div><p className="text-[10px] text-[var(--muted)]">POSIÇÃO</p><p className="mt-1 text-sm font-bold">{game.position ? positionLabels[game.position] : "—"}</p></div>
              <div><p className="text-[10px] text-[var(--muted)]">TIME</p><p className="mt-1 text-sm font-bold">{game.team_number ? `Time ${game.team_number}` : "—"}</p></div>
              <div><p className="text-[10px] text-[var(--muted)]">DESTAQUES</p><p className="mt-1 text-sm font-bold">⚽ {game.goals} · 🟨 {game.yellow_cards} · 🟥 {game.red_cards}</p></div>
              <div><p className="text-[10px] text-[var(--muted)]">PAGAMENTO</p><p className="mt-1 text-sm font-bold">{game.payment_status === "paid" ? "Pago" : game.payment_status === "pending" ? "Pendente" : "Sem cobrança"}</p></div>
            </div>
          </article>
        )) : (
          <div className="card p-6 text-sm text-[var(--muted)]">Nenhum jogo vinculado a este participante ainda.</div>
        )}
      </div>
    </section>
    <section className="card mt-8 border-[var(--danger)]/20 p-5">
      <h2 className="font-bold text-[var(--danger)]">Zona de exclusão</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
        Exclui permanentemente o participante e, quando existir, a conta de acesso vinculada. O histórico de movimentações financeiras já registrado é preservado para manter a contabilidade do grupo.
      </p>
      <div className="mt-4">
        <ParticipantDeleteButton participantId={participant.id} participantName={participant.name}/>
      </div>
    </section>
  </div>;
}
