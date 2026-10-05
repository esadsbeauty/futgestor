import type { FeeStatus } from "@/lib/finance";
const style = { paid: "bg-[var(--brand)]/15 text-[var(--brand)]", pending: "bg-[var(--warning)]/15 text-[var(--warning)]", overdue: "bg-[var(--danger)]/15 text-[var(--danger)]" };
const label = { paid: "Pago", pending: "Pendente", overdue: "Atrasado" };
export function StatusBadge({ status }: { status: FeeStatus }) { return <span className={`rounded-full px-3 py-1 text-xs font-bold ${style[status]}`}>{label[status]}</span>; }
