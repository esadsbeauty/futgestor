import { AlertCircle, CheckCircle2 } from "lucide-react";

export function MonthlyInsight({ message, positive }: { message: string; positive: boolean }) {
  const Icon = positive ? CheckCircle2 : AlertCircle;
  return <aside className={`mt-5 flex items-start gap-3 rounded-2xl border p-4 text-sm ${positive ? "border-[var(--brand)]/20 bg-[var(--brand)]/10" : "border-[var(--warning)]/20 bg-[var(--warning)]/10"}`}><Icon size={19} className={positive ? "mt-0.5 shrink-0 text-[var(--brand)]" : "mt-0.5 shrink-0 text-[var(--warning)]"}/><p className="leading-6">{message}</p></aside>;
}
