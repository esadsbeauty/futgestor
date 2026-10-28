import { Crown, Medal, Trophy } from "lucide-react";
import Link from "next/link";
import type { GoalRankingEntry } from "@/types/dashboard";

function positionIcon(position: number) {
  if (position === 0) return <Crown size={18} className="text-[var(--warning)]" />;
  if (position === 1) return <Medal size={18} className="text-[var(--brand)]" />;
  if (position === 2) return <Medal size={18} className="text-[var(--success)]" />;
  return <span className="text-xs font-black text-[var(--muted)]">{position + 1}º</span>;
}

export function GoalRanking({ ranking }: { ranking: GoalRankingEntry[] }) {
  return (
    <section className="card mt-5 overflow-hidden p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[.18em] text-[var(--brand)]">Artilharia</p>
          <h2 className="mt-1 text-lg font-extrabold">Ranking de gols</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Quem mais balançou a rede no grupo.</p>
        </div>
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--warning)]/10 text-[var(--warning)]">
          <Trophy size={21} />
        </span>
      </div>

      {ranking.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-[var(--border)] px-4 py-7 text-center">
          <p className="text-sm font-semibold">Ainda não há gols registrados.</p>
          <p className="mt-1 text-xs text-[var(--muted)]">Registre os gols nos detalhes dos jogos para montar a artilharia.</p>
          <Link href="/jogos" className="focus-ring mt-4 inline-flex rounded-xl border border-[var(--border)] bg-white/[.03] px-3 py-2 text-xs font-bold text-[var(--brand)]">
            Ver jogos
          </Link>
        </div>
      ) : (
        <div className="mt-5 space-y-2">
          {ranking.map((entry, index) => (
            <div key={entry.playerId} className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-white/[.025] px-3.5 py-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/[.04]">
                {positionIcon(index)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{entry.playerName}</p>
                <p className="mt-0.5 text-[11px] text-[var(--muted)]">{index === 0 ? "Artilheiro atual" : String(index + 1) + "º colocado"}</p>
              </div>
              <div className="text-right">
                <strong className="text-xl font-black text-[var(--brand)]">{entry.goals}</strong>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">{entry.goals === 1 ? "gol" : "gols"}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}