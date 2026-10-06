import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { formatMonthYear } from "@/lib/formatters";

function shiftMonth(referenceMonth: string, offset: number) {
  const [year, month] = referenceMonth.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function MonthSelector({ month }: { month: string }) {
  return <div className="flex items-center rounded-xl border border-[var(--border)] bg-white/5 p-1">
    <Link aria-label="Mês anterior" href={`/financeiro?mes=${shiftMonth(month, -1)}`} className="focus-ring grid size-10 place-items-center rounded-lg text-[var(--muted)] hover:bg-white/5 hover:text-white"><ChevronLeft size={19}/></Link>
    <span className="min-w-36 px-2 text-center text-sm font-semibold">{formatMonthYear(`${month}-01`)}</span>
    <Link aria-label="Próximo mês" href={`/financeiro?mes=${shiftMonth(month, 1)}`} className="focus-ring grid size-10 place-items-center rounded-lg text-[var(--muted)] hover:bg-white/5 hover:text-white"><ChevronRight size={19}/></Link>
  </div>;
}
