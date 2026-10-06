import { CalendarDays } from "lucide-react";
import { firstName, formatMonthYear } from "@/lib/formatters";

export function DashboardHeader({ organizationName, profileName, referenceMonth }: { organizationName: string; profileName: string | null; referenceMonth: string }) {
  return <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-[var(--brand)]">{organizationName}</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Olá, {firstName(profileName)}</h1></div><div className="flex w-fit items-center gap-2 rounded-xl border border-[var(--border)] bg-white/5 px-4 py-3 text-sm font-semibold"><CalendarDays size={18} className="text-[var(--brand)]"/><span>{formatMonthYear(referenceMonth)}</span></div></header>;
}
