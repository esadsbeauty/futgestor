import { AlertTriangle, ArrowDownRight, ArrowUpRight, CircleDollarSign, Clock3, Users } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import type { FinancialOverview } from "@/types/finance";

export function DashboardSummaryCards({ overview, activeParticipants, overdueFees }: { overview: FinancialOverview; activeParticipants: number; overdueFees: number }) {
  const cards = [
    { label: "Caixa atual", value: formatCurrency(overview.currentBalance), icon: CircleDollarSign, color: "text-[var(--brand)]", featured: true },
    { label: "Recebido no mês", value: formatCurrency(overview.receivedFees), icon: ArrowUpRight, color: "text-[var(--brand)]" },
    { label: "Em aberto no mês", value: formatCurrency(overview.openFees), icon: Clock3, color: "text-[var(--warning)]" },
    { label: "Participantes ativos", value: String(activeParticipants), icon: Users, color: "text-white" },
    { label: "Mensalidades atrasadas", value: String(overdueFees), icon: AlertTriangle, color: overdueFees ? "text-[var(--danger)]" : "text-[var(--brand)]" },
    { label: "Despesas do mês", value: formatCurrency(overview.monthExpenses), icon: ArrowDownRight, color: "text-[var(--danger)]" },
  ];
  return <section aria-label="Visão geral" className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-3">{cards.map(({ label, value, icon: Icon, color, featured }) => <article key={label} className={`card relative overflow-hidden p-4 sm:p-5 ${featured ? "col-span-2 lg:col-span-1" : ""}`}>{featured && <span className="absolute -right-8 -top-12 size-32 rounded-full bg-[var(--brand)]/10 blur-2xl"/>}<Icon size={20} className={color}/><p className="mt-4 text-xs text-[var(--muted)] sm:text-sm">{label}</p><p className={`mt-1 text-lg font-bold tracking-tight sm:text-2xl ${color}`}>{value}</p></article>)}</section>;
}
