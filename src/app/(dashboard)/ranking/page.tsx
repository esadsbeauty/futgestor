import Link from "next/link";
import { Trophy, Crown, Medal, ArrowLeft } from "lucide-react";
import { getCurrentOrganizationForUser } from "@/lib/queries/participants";
import { getCompleteGoalRanking } from "@/lib/queries/dashboard";

export const dynamic = "force-dynamic";

export default async function RankingPage() {
  const organization = await getCurrentOrganizationForUser();
  const ranking = await getCompleteGoalRanking(organization.id);
  const totalGoals = ranking.reduce((total, entry) => total + entry.goals, 0);

  return <div className="mx-auto max-w-5xl pb-12">
    <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-[var(--muted)]"><ArrowLeft size={16}/> Voltar ao início</Link>
    <header className="mt-5">
      <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[var(--brand)]">Estatísticas do grupo</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Ranking geral de gols</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">Artilharia acumulada de todos os jogos do grupo {organization.name}. Inclui gols de participantes e convidados registrados.</p>
    </header>
    <div className="mt-6 grid grid-cols-2 gap-3">
      <div className="card p-4 sm:p-5"><p className="text-xs text-[var(--muted)]">Gols registrados</p><strong className="mt-2 block text-3xl font-black text-[var(--brand)]">{totalGoals}</strong></div>
      <div className="card p-4 sm:p-5"><p className="text-xs text-[var(--muted)]">Artilheiros</p><strong className="mt-2 block text-3xl font-black">{ranking.length}</strong></div>
    </div>
    <section className="card mt-5 overflow-hidden p-4 sm:p-6" aria-label="Classificação geral de gols">
      {ranking.length === 0 ? <div className="py-10 text-center"><Trophy className="mx-auto text-[var(--brand)]" size={32}/><p className="mt-3 font-bold">Ainda não há gols registrados.</p><p className="mt-1 text-sm text-[var(--muted)]">Registre os gols nos jogos para formar o ranking.</p></div> :
      <div className="space-y-2">{ranking.map((entry, index) => <div key={entry.playerId} className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-white/[.025] px-3.5 py-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/[.04]">{index === 0 ? <Crown size={19} className="text-[var(--warning)]"/> : index < 3 ? <Medal size={18} className="text-[var(--brand)]"/> : <span className="text-xs font-black text-[var(--muted)]">{index+1}º</span>}</span>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{entry.playerName}</p><p className="text-[11px] text-[var(--muted)]">{index+1}º colocado</p></div>
        <div className="text-right"><strong className="text-xl font-black text-[var(--brand)]">{entry.goals}</strong><p className="text-[10px] font-semibold uppercase text-[var(--muted)]">{entry.goals===1?"gol":"gols"}</p></div>
      </div>)}</div>}
    </section>
  </div>;
}
