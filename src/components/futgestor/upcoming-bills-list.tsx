import { CalendarClock, ChevronRight } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/futgestor/status-badge";
import { formatCurrency, formatDate } from "@/lib/formatters";
import type { BillWithStatus } from "@/types/finance";

export function UpcomingBillsList({ bills }: { bills: BillWithStatus[] }) {
  return <section><div className="flex items-center justify-between gap-4"><div><h2 className="text-xl font-bold">Próximas contas</h2><p className="mt-1 text-sm text-[var(--muted)]">Pendências ordenadas pelo vencimento.</p></div><Link href="/financeiro" className="focus-ring flex shrink-0 items-center gap-1 rounded-lg text-sm font-semibold text-[var(--brand)]">Ver financeiro<ChevronRight size={16}/></Link></div>{bills.length === 0 ? <div className="card mt-4 grid place-items-center px-5 py-10 text-center"><CalendarClock className="text-[var(--muted)]"/><p className="mt-3 text-sm text-[var(--muted)]">Nenhuma conta pendente.</p></div> : <div className="card mt-4 divide-y divide-[var(--border)]">{bills.map((bill) => <article key={bill.id} className="flex items-center gap-3 p-4"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/5 text-[var(--muted)]"><CalendarClock size={18}/></span><div className="min-w-0 flex-1"><p className="truncate font-semibold">{bill.description}</p><p className="mt-1 text-xs text-[var(--muted)]">Vence em {formatDate(bill.due_date)}</p></div><div className="text-right"><strong className="text-sm">{formatCurrency(bill.amount)}</strong><div className="mt-1.5"><StatusBadge status={bill.effectiveStatus}/></div></div></article>)}</div>}</section>;
}
