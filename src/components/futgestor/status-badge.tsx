import type { FeeStatus } from "@/lib/finance";

type Status = FeeStatus | "inactive";

const style: Record<Status, string> = {
  paid: "bg-[var(--brand)]/15 text-[var(--brand)]",
  pending: "bg-[var(--warning)]/15 text-[var(--warning)]",
  overdue: "bg-[var(--danger)]/15 text-[var(--danger)]",
  inactive: "bg-white/10 text-[var(--muted)]",
};

const label: Record<Status, string> = {
  paid: "Pago",
  pending: "Pendente",
  overdue: "Atrasado",
  inactive: "Inativo",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold ${style[status]}`}
    >
      {label[status]}
    </span>
  );
}