import type { FeeStatus } from "@/lib/finance";
import { formatCurrency } from "./formatters";
import type { DashboardFeeSummary } from "@/types/dashboard";

type FeeForDashboard = { effectiveStatus: FeeStatus; due_date: string; amount: number };

export function paidFeePercentage(paid: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((paid / total) * 100);
}

export function summarizeDashboardFees(fees: FeeForDashboard[]): DashboardFeeSummary {
  const paid = fees.filter((fee) => fee.effectiveStatus === "paid").length;
  const pending = fees.filter((fee) => fee.effectiveStatus === "pending").length;
  const overdue = fees.filter((fee) => fee.effectiveStatus === "overdue").length;
  return { total: fees.length, paid, pending, overdue, paidPercentage: paidFeePercentage(paid, fees.length) };
}

export function prioritizeAttentionFees<T extends FeeForDashboard>(fees: T[], limit = 5) {
  const rank: Record<FeeStatus, number> = { overdue: 0, pending: 1, paid: 2 };
  return fees
    .filter((fee) => fee.effectiveStatus !== "paid")
    .toSorted((left, right) => rank[left.effectiveStatus] - rank[right.effectiveStatus] || left.due_date.localeCompare(right.due_date))
    .slice(0, limit);
}

export function monthlyInsight(summary: DashboardFeeSummary, openAmount: number) {
  if (summary.overdue > 0) return `${summary.overdue} ${summary.overdue === 1 ? "mensalidade atrasada precisa" : "mensalidades atrasadas precisam"} de atenção.`;
  if (openAmount > 0) return `Você ainda tem ${formatCurrency(openAmount)} em mensalidades em aberto.`;
  if (summary.total > 0) return "Todas as mensalidades do mês estão em dia.";
  return "As mensalidades aparecerão aqui quando houver participantes ativos.";
}
