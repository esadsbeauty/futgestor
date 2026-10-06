import { CalendarClock } from "lucide-react";
import { BillForm } from "@/components/futgestor/bill-form";
import { FinanceActionButton } from "@/components/futgestor/finance-action-button";
import { StatusBadge } from "@/components/futgestor/status-badge";
import { formatCurrency, formatDate } from "@/lib/formatters";
import type { BillWithStatus } from "@/types/finance";

export function BillsList({ bills, defaultDate }: { bills: BillWithStatus[]; defaultDate: string }) {
  const openTotal = bills.filter((bill) => bill.status !== "paid").reduce((sum, bill) => sum + bill.amount, 0);
  return <section className="mt-12"><div className="flex items-end justify-between gap-4"><div><h2 className="text-xl font-bold">Contas a pagar</h2><p className="mt-1 text-sm text-[var(--muted)]">Em aberto: {formatCurrency(openTotal)}</p></div><BillForm defaultDate={defaultDate}/></div>
    {bills.length === 0 ? <div className="card mt-5 grid place-items-center px-5 py-12 text-center"><CalendarClock className="text-[var(--muted)]"/><p className="mt-4 text-[var(--muted)]">Nenhuma conta a pagar neste período.</p></div> : <div className="card mt-5 divide-y divide-[var(--border)]">{bills.map((bill) => <article key={bill.id} className="flex flex-wrap items-center gap-4 p-4 sm:flex-nowrap sm:p-5"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/5 text-[var(--muted)]"><CalendarClock size={20}/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-semibold">{bill.description}</h3><StatusBadge status={bill.effectiveStatus}/></div><p className="mt-1.5 text-xs text-[var(--muted)]">{bill.paid_at ? `Pago em ${formatDate(bill.paid_at)}` : `Vencimento em ${formatDate(bill.due_date)}`}</p></div><div className="ml-auto flex items-center gap-3"><strong>{formatCurrency(bill.amount)}</strong>{bill.effectiveStatus !== "paid" && <FinanceActionButton kind="bill" id={bill.id}/>}</div></article>)}</div>}
  </section>;
}
