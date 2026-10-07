import { AlertTriangle, ArrowDownRight, CircleDollarSign, Users } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import type { BillingMode } from "@/types/billing";
import type { FinancialOverview } from "@/types/finance";

export function DashboardSummaryCards({ overview, activeParticipants, overdueFees, billingMode = "monthly" }: { overview: FinancialOverview; activeParticipants: number; overdueFees: number; billingMode?: BillingMode }) {
  const secondary = [
    { label: "Participantes ativos", value: String(activeParticipants).padStart(2, "0"), icon: Users, color: "text-[var(--brand)]" },
    billingMode === "per_game" ? { label: "Modelo de cobrança", value: "Por jogo", icon: CircleDollarSign, color: "text-[var(--brand)]" } : { label: "Em atraso", value: String(overdueFees).padStart(2, "0"), icon: AlertTriangle, color: overdueFees ? "text-[var(--danger)]" : "text-[var(--success)]" },
    { label: "Despesas do mês", value: formatCurrency(overview.monthExpenses), icon: ArrowDownRight, color: "text-[var(--danger)]" },
  ];
  return <section aria-label="Visão geral" className="mt-7 grid gap-3 lg:grid-cols-3">
    <article className="card relative overflow-hidden border-[var(--border-strong)] p-5 shadow-[var(--shadow),var(--glow)] sm:p-7 lg:col-span-3">
      <span className="absolute -right-20 -top-24 size-72 rounded-full bg-[var(--brand)]/15 blur-3xl"/><span className="absolute bottom-0 left-1/3 h-px w-1/2 bg-gradient-to-r from-transparent via-[var(--brand)]/50 to-transparent"/>
      <div className="relative"><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[var(--muted)]">Caixa atual</p><div className="mt-3 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-2xl bg-[var(--brand)]/10 text-[var(--brand)]"><CircleDollarSign size={21}/></span><p className="text-4xl font-black tracking-[-.045em] text-white sm:text-5xl">{formatCurrency(overview.currentBalance)}</p></div>
        <div className="mt-7 grid grid-cols-3 gap-2.5">{[
          { label: "Previsto", value: overview.expectedFees, color: "text-white" },
          { label: "Recebido", value: overview.receivedFees, color: "text-[var(--success)]" },
          { label: "Em aberto", value: overview.openFees, color: "text-[var(--warning)]" },
        ].map((item) => <div key={item.label} className="rounded-2xl border border-white/[.055] bg-black/15 p-3 sm:p-4"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[var(--muted)]">{item.label}</p><p className={`mt-2 truncate text-sm font-extrabold sm:text-lg ${item.color}`}>{formatCurrency(item.value)}</p></div>)}</div>
      </div>
    </article>
    {secondary.map(({ label, value, icon: Icon, color }) => <article key={label} className="card flex items-center gap-4 p-4 sm:p-5"><span className={`grid size-11 shrink-0 place-items-center rounded-2xl bg-white/[.045] ${color}`}><Icon size={20}/></span><div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-[var(--muted)]">{label}</p><p className={`mt-1 truncate text-xl font-extrabold tracking-tight ${color}`}>{value}</p></div></article>)}
  </section>;
}
