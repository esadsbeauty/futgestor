import { AlertTriangle, CircleDollarSign, Clock3 } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import type { ParticipantFinancialSummary } from "@/types/participants";

export function ParticipantSummary({ summary }: { summary: ParticipantFinancialSummary }) {
  const items = [
    { label: "Total pago", value: formatCurrency(summary.totalPaid), icon: CircleDollarSign, color: "text-[var(--brand)]" },
    { label: "Em aberto", value: formatCurrency(summary.outstanding), icon: Clock3, color: "text-[var(--warning)]" },
    { label: "Atrasos", value: String(summary.overdueCount), icon: AlertTriangle, color: "text-[var(--danger)]" },
  ];
  return <section className="mt-5 grid grid-cols-3 gap-3">{items.map(({ label, value, icon: Icon, color }) => <div key={label} className="card p-4 sm:p-5"><Icon size={19} className={color}/><p className="mt-4 text-xs text-[var(--muted)] sm:text-sm">{label}</p><p className="mt-1 text-base font-bold sm:text-xl">{value}</p></div>)}</section>;
}
