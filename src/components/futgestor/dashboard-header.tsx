import { CalendarDays } from "lucide-react";
import { firstName, formatMonthYear } from "@/lib/formatters";

export function DashboardHeader({ organizationName, profileName, referenceMonth }: { organizationName: string; profileName: string | null; referenceMonth: string }) {
  return <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[var(--brand)]">{organizationName}</p><h1 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-4xl">Olá, {firstName(profileName)}<span className="text-[var(--brand)]">.</span></h1><p className="mt-2 text-sm text-[var(--muted)]">Aqui está o resumo do seu baba.</p></div><div className="flex w-fit items-center gap-2.5 rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-glass)] px-4 py-3 text-sm font-bold shadow-[var(--glow)]"><CalendarDays size={18} className="text-[var(--brand)]"/><span>{formatMonthYear(referenceMonth)}</span></div></header>;
}
