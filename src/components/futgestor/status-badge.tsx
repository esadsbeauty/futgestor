import type { FeeStatus } from "@/lib/finance";
const style = {
  paid: "border border-[var(--success)]/20 bg-[var(--success)]/10 text-[var(--success)]",
  pending: "border border-[var(--warning)]/20 bg-[var(--warning)]/10 text-[var(--warning)]",
  overdue: "border border-[var(--danger)]/20 bg-[var(--danger)]/10 text-[var(--danger)]",
  inactive: "border border-white/5 bg-white/[.06] text-[var(--muted)]",
  per_game: "border border-[var(--brand)]/15 bg-[var(--brand)]/10 text-[var(--brand)]",
};
const label = { paid: "Pago", pending: "Pendente", overdue: "Atrasado", inactive: "Inativo", per_game: "Por jogo" };
export function StatusBadge({ status }: { status: FeeStatus | "inactive" | "per_game" }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${style[status]}`}>{label[status]}</span>;
}
