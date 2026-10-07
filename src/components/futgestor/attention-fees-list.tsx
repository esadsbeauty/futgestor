import { ChevronRight, CircleCheck } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/futgestor/status-badge";
import { formatCurrency, formatDate, initials } from "@/lib/formatters";
import type { FeeWithPlayer } from "@/types/finance";

export function AttentionFeesList({ fees, financeHref }: { fees: FeeWithPlayer[]; financeHref: string }) {
  return <section><div className="flex items-center justify-between gap-4"><div><h2 className="text-xl font-bold">Precisam de atenção</h2><p className="mt-1 text-sm text-[var(--muted)]">Mensalidades atrasadas ou próximas do vencimento.</p></div><Link href={financeHref} className="focus-ring flex shrink-0 items-center gap-1 rounded-lg text-sm font-semibold text-[var(--brand)]">Ver todas<ChevronRight size={16}/></Link></div>{fees.length === 0 ? <div className="card mt-4 grid place-items-center px-5 py-10 text-center"><CircleCheck className="text-[var(--brand)]"/><p className="mt-3 text-sm text-[var(--muted)]">Nenhuma mensalidade precisa de atenção.</p></div> : <div className="card mt-4 divide-y divide-[var(--border)]">{fees.map((fee) => <article key={fee.id} className="flex items-center gap-3 p-4"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-bold">{initials(fee.playerName)}</span><div className="min-w-0 flex-1"><p className="truncate font-semibold">{fee.playerName}</p><p className="mt-1 text-xs text-[var(--muted)]">Vence em {formatDate(fee.due_date)}</p></div><div className="text-right"><strong className="text-sm">{formatCurrency(fee.amount)}</strong><div className="mt-1.5"><StatusBadge status={fee.effectiveStatus}/></div></div></article>)}</div>}</section>;
}
