"use client";

import { Search, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { FinanceActionButton } from "@/components/futgestor/finance-action-button";
import { StatusBadge } from "@/components/futgestor/status-badge";
import { matchesFinancialStatus, type FeeStatus } from "@/lib/finance";
import { formatCurrency, formatDate, initials } from "@/lib/formatters";
import type { FeeWithPlayer } from "@/types/finance";

const filters: Array<{ value: FeeStatus | "all"; label: string }> = [{ value: "all", label: "Todos" }, { value: "paid", label: "Pagos" }, { value: "pending", label: "Pendentes" }, { value: "overdue", label: "Atrasados" }];

export function MonthlyFeesList({ fees }: { fees: FeeWithPlayer[] }) {
  const [filter, setFilter] = useState<FeeStatus | "all">("all");
  const [search, setSearch] = useState("");
  const visible = useMemo(() => {
    const statusMatches = matchesFinancialStatus(fees, filter);
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return statusMatches.filter((fee) => fee.playerName.toLocaleLowerCase("pt-BR").includes(term));
  }, [fees, filter, search]);
  const paid = fees.filter((fee) => fee.effectiveStatus === "paid").length;
  const pending = fees.filter((fee) => fee.effectiveStatus === "pending").length;
  const overdue = fees.filter((fee) => fee.effectiveStatus === "overdue").length;

  return <section className="mt-12"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold">Mensalidades do mês</h2><p className="mt-1 text-sm text-[var(--muted)]">{fees.length} no total · {paid} pagas · {pending} pendentes · {overdue} atrasadas</p></div></div>
    {fees.length > 0 && <><label className="relative mt-5 block"><span className="sr-only">Buscar participante</span><Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]"/><input value={search} onChange={(event) => setSearch(event.target.value)} className="input mt-0 pl-11" placeholder="Buscar participante"/></label><div className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-2 sm:mx-0 sm:px-0">{filters.map((item) => <button key={item.value} onClick={() => setFilter(item.value)} className={`focus-ring shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${filter === item.value ? "border-[var(--brand)] bg-[var(--brand)] text-[#07110d]" : "border-[var(--border)] bg-white/5 text-[var(--muted)]"}`}>{item.label}</button>)}</div></>}
    {fees.length === 0 ? <div className="card mt-5 grid place-items-center px-5 py-12 text-center"><Users className="text-[var(--muted)]"/><p className="mt-4 text-[var(--muted)]">Nenhuma mensalidade neste mês.</p></div> : visible.length === 0 ? <div className="card mt-5 px-5 py-10 text-center text-[var(--muted)]">Todas as mensalidades estão em dia ou nenhuma corresponde ao filtro.</div> : <div className="card mt-5 divide-y divide-[var(--border)]">{visible.map((fee) => <article key={fee.id} className="flex flex-wrap items-center gap-4 p-4 sm:flex-nowrap sm:p-5"><span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-[var(--brand)]/15 bg-[var(--brand)]/10 text-sm font-extrabold text-[var(--brand)]">{initials(fee.playerName)}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-semibold">{fee.playerName}</h3><StatusBadge status={fee.effectiveStatus}/></div><p className="mt-1.5 text-xs text-[var(--muted)]">Vencimento em {formatDate(fee.due_date)}</p></div><div className="ml-auto flex items-center gap-3"><strong>{formatCurrency(fee.amount)}</strong>{fee.effectiveStatus !== "paid" && <FinanceActionButton kind="fee" id={fee.id}/>}</div></article>)}</div>}
  </section>;
}
