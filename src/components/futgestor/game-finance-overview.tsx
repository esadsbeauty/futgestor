import {
  ArrowDownRight,
  ArrowUpRight,
  Clock3,
  Target,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import type { GameFinancialOverview } from "@/types/finance";

export function GameFinanceOverview({
  overview,
}: {
  overview: GameFinancialOverview;
}) {
  const cards = [
    {
      label: "Previsto nos jogos",
      value: overview.expected,
      icon: Target,
      accent: "text-white",
    },
    {
      label: "Recebido dos jogos",
      value: overview.received,
      icon: ArrowUpRight,
      accent: "text-[var(--success)]",
    },
    {
      label: "Em aberto nos jogos",
      value: overview.open,
      icon: Clock3,
      accent: "text-[var(--warning)]",
    },
    {
      label: "Despesas dos jogos",
      value: overview.totalExpenses,
      icon: ArrowDownRight,
      accent: "text-[var(--danger)]",
    },
    {
      label: "A pagar dos jogos",
      value: overview.openExpenses,
      icon: WalletCards,
      accent: "text-[var(--warning)]",
    },
    {
      label: "Resultado esperado",
      value: overview.expectedResult,
      icon: TrendingUp,
      accent:
        overview.expectedResult >= 0
          ? "text-[var(--brand)]"
          : "text-[var(--danger)]",
    },
  ];

  return (
    <section className="mt-10">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[var(--brand)]">
          Jogos do mês
        </p>
        <h2 className="mt-1 text-xl font-black">Financeiro dos jogos</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Previsto, recebido, pendências e despesas das partidas deste mês.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        {cards.map(({ label, value, icon: Icon, accent }) => (
          <article key={label} className="card p-4 sm:p-5">
            <span
              className={`grid size-9 place-items-center rounded-xl bg-white/[.045] ${accent}`}
            >
              <Icon size={18} />
            </span>
            <p className="mt-3 text-[9px] font-bold uppercase tracking-[.14em] text-[var(--muted)]">
              {label}
            </p>
            <strong className={`mt-1.5 block text-xl font-black ${accent}`}>
              {formatCurrency(value)}
            </strong>
          </article>
        ))}
      </div>
    </section>
  );
}
