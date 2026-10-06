import { CalendarDays, ReceiptText } from "lucide-react";
import { PayFeeButton } from "@/components/futgestor/pay-fee-button";
import { StatusBadge } from "@/components/futgestor/status-badge";
import { effectiveFeeStatus } from "@/lib/finance";
import { formatCurrency, formatDate, formatMonthYear } from "@/lib/formatters";
import type { MonthlyFee } from "@/types/participants";

export function FeeHistory({ fees, participantId }: { fees: MonthlyFee[]; participantId: string }) {
  return <section className="mt-10"><h2 className="text-xl font-bold">Histórico de mensalidades</h2><p className="mt-1 text-sm text-[var(--muted)]">Mensalidades preservadas em ordem cronológica.</p>
    {fees.length === 0 ? <div className="card mt-4 grid place-items-center px-5 py-12 text-center"><ReceiptText className="text-[var(--muted)]"/><p className="mt-4 text-[var(--muted)]">Nenhuma mensalidade encontrada.</p></div> : <div className="card mt-4 divide-y divide-[var(--border)]">{fees.map((fee) => { const status = effectiveFeeStatus(fee.status, fee.due_date); return <article key={fee.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/5 text-[var(--muted)]"><CalendarDays size={20}/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{formatMonthYear(fee.reference_month)}</h3><StatusBadge status={status}/></div><p className="mt-1.5 text-xs text-[var(--muted)]">{fee.paid_at ? `Pago em ${formatDate(fee.paid_at)}` : `Vencimento em ${formatDate(fee.due_date)}`}</p></div><div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end"><strong>{formatCurrency(fee.amount)}</strong>{status !== "paid" && <PayFeeButton feeId={fee.id} participantId={participantId} compact/>}</div></article>; })}</div>}
  </section>;
}
