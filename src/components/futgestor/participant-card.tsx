import { ChevronRight, Phone } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/futgestor/status-badge";
import { formatCurrency, initials } from "@/lib/formatters";
import type { ParticipantWithCurrentFee } from "@/types/participants";

export function ParticipantCard({ participant }: { participant: ParticipantWithCurrentFee }) {
  return (
    <Link href={`/participantes/${participant.id}`} className="focus-ring card group flex items-center gap-4 p-4 transition duration-200 hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow),var(--glow)] sm:p-5">
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-[var(--brand)]/15 bg-[var(--brand)]/10 font-extrabold text-[var(--brand)]">{initials(participant.name)}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2"><h2 className="truncate font-semibold">{participant.name}</h2><StatusBadge status={participant.financialStatus}/></div>
        <p className="mt-1.5 text-sm text-[var(--muted)]">{participant.financialStatus === "per_game" ? "Cobrança por jogo" : `${formatCurrency(participant.monthly_fee)}/mês`}</p>
        {participant.phone && <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-[var(--muted)]"><Phone size={13}/>{participant.phone}</p>}
      </div>
      <ChevronRight size={20} className="shrink-0 text-[var(--muted)] transition group-hover:translate-x-0.5 group-hover:text-white"/>
    </Link>
  );
}
