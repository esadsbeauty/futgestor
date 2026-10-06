import { ArrowDownRight, ArrowUpRight, CircleDollarSign, Clock3, Target, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import type { FinancialOverview } from "@/types/finance";

export function FinanceSummaryCards({ overview }: { overview: FinancialOverview }) {
  const cards = [
    { label: "Caixa atual", value: overview.currentBalance, icon: CircleDollarSign, accent: "text-[var(--brand)]", featured: true },
    { label: "Previsto no mês", value: overview.expectedFees, icon: Target, accent: "text-white" },
    { label: "Recebido no mês", value: overview.receivedFees, icon: ArrowUpRight, accent: "text-[var(--success)]" },
    { label: "Em aberto", value: overview.openFees, icon: Clock3, accent: "text-[var(--warning)]" },
    { label: "Despesas do mês", value: overview.monthExpenses, icon: ArrowDownRight, accent: "text-[var(--danger)]" },
    { label: "Resultado do mês", value: overview.monthResult, icon: TrendingUp, accent: overview.monthResult >= 0 ? "text-[var(--brand)]" : "text-[var(--danger)]" },
  ];
  return <section aria-label="Resumo financeiro" className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-3">{cards.map(({ label, value, icon: Icon, accent, featured }) => <article key={label} className={`card relative overflow-hidden p-4 sm:p-6 ${featured ? "col-span-2 border-[var(--border-strong)] shadow-[var(--shadow),var(--glow)] lg:col-span-1" : ""}`}>
    {featured && <span className="absolute -right-8 -top-12 size-36 rounded-full bg-[var(--brand)]/15 blur-3xl"/>}
    <span className={`grid size-9 place-items-center rounded-xl bg-white/[.045] ${accent}`}><Icon size={18}/></span><p className="mt-4 text-[9px] font-bold uppercase tracking-[.16em] text-[var(--muted)]">{label}</p><p className={`mt-1.5 text-lg font-extrabold tracking-[-.025em] sm:text-2xl ${accent}`}>{formatCurrency(value)}</p>
  </article>)}</section>;
}
