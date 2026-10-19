"use client";

import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  CircleDollarSign,
  House,
  LogOut,
  MapPin,
  ShieldCheck,
  Trophy,
  UserRound,
  WalletCards,
  XCircle,
} from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import {
  logoutPlayer,
} from "@/lib/mutations/player-account";
import { formatCurrency, formatDate, firstName } from "@/lib/formatters";
import { PlayerGameAttendance } from "@/components/futgestor/player-game-attendance";
import { PlayerPositionForm } from "@/components/futgestor/player-position-form";
import type {
  PlayerAccountData,
  PlayerAccountGame,
  PlayerConfirmedRosterEntry,
  PlayerGamePaymentEntry,
} from "@/types/player-account";

const initialState: PlayerAccountActionState = { ok: false };
type PlayerTab = "home" | "games" | "ranking" | "finance" | "profile";

const futsalPositions = [
  ["goalkeeper", "Goleiro"],
  ["fixed", "Fixo"],
  ["winger", "Ala"],
  ["pivot", "Pivô"],
  ["other", "Outra"],
] as const;

const footballPositions = [
  ["goalkeeper", "Goleiro"],
  ["full_back", "Lateral"],
  ["center_back", "Zagueiro"],
  ["defensive_mid", "Volante"],
  ["midfielder", "Meio-campo"],
  ["winger", "Ponta"],
  ["striker", "Atacante"],
  ["other", "Outra"],
] as const;

function AttendanceButtons({ game }: { game: PlayerAccountGame }) {
  const [state, action, pending] = useActionState(
    respondMyGameAttendance,
    initialState
  );

  const status = state.ok && state.status ? state.status : game.attendance_status;

  if (game.attendance_locked) {
    return (
      <div className="mt-5 border-t border-[var(--border)] pt-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-[var(--muted)]">Sua presença</p>
            <p className="mt-1 text-sm font-bold text-[var(--muted)]">
              Jogo encerrado para confirmações
            </p>
          </div>
          <Clock3 className="text-[var(--muted)]" size={22} />
        </div>
        <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
          O horário deste jogo já passou. A sua resposta fica apenas para consulta.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5 border-t border-[var(--border)] pt-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-[var(--muted)]">Sua presença</p>
          <p
            className={
              status === "confirmed"
                ? "mt-1 text-sm font-bold text-[var(--success)]"
                : status === "declined"
                  ? "mt-1 text-sm font-bold text-[var(--danger)]"
                  : "mt-1 text-sm font-bold text-[var(--warning)]"
            }
          >
            {status === "confirmed"
              ? "Presença confirmada"
              : status === "declined"
                ? "Não vou"
                : "Pendente"}
          </p>
        </div>
        {status === "confirmed" ? (
          <CheckCircle2 className="text-[var(--success)]" size={22} />
        ) : status === "declined" ? (
          <XCircle className="text-[var(--danger)]" size={22} />
        ) : null}
      </div>

      <div className="mt-4">
        <label>
          <span className="text-xs text-[var(--muted)]">Sua posição</span>
          <select
            name="position"
            form={`attendance-confirm-${game.game_id}`}
            className="input mt-2"
            defaultValue={game.attendance_position ?? game.default_position ?? ""}
            required
          >
            <option value="" disabled>Selecione sua posição</option>
            {(game.game_format === "field" ? footballPositions : futsalPositions).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <form id={`attendance-confirm-${game.game_id}`} action={action}>
          <input type="hidden" name="game_id" value={game.game_id} />
          <input type="hidden" name="status" value="confirmed" />
          <button
            disabled={pending}
            className="focus-ring min-h-11 w-full rounded-xl bg-[var(--success)] px-4 text-sm font-bold text-[#02150d] disabled:opacity-40"
          >
            {pending ? "Salvando..." : "Vou jogar"}
          </button>
        </form>
        <form action={action}>
          <input type="hidden" name="game_id" value={game.game_id} />
          <input type="hidden" name="status" value="declined" />
          <button
            disabled={pending || status === "declined"}
            className="focus-ring min-h-11 w-full rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-4 text-sm font-bold text-[var(--danger)] disabled:opacity-40"
          >
            {pending ? "Salvando..." : "Não vou"}
          </button>
        </form>
      </div>

      {state.message && !state.ok ? (
        <p className="mt-3 text-sm text-[var(--danger)]">{state.message}</p>
      ) : null}
    </div>
  );
}

function GameCard({
  game,
  featured = false,
}: {
  game: PlayerAccountGame;
  featured?: boolean;
}) {
  return (
    <article
      className={`${featured ? "glow-card border-[var(--brand)]/25" : ""} card p-5`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[var(--brand)]">
            {game.attendance_locked
              ? "Jogo encerrado"
              : featured
                ? "Próximo jogo"
                : "Jogo agendado"}
          </p>
          <h3 className="mt-2 text-xl font-black">{game.title}</h3>
        </div>
        <CalendarDays className="text-[var(--brand)]" />
      </div>

      <div className="mt-5 grid gap-3 text-sm text-[var(--muted)] sm:grid-cols-3">
        <p className="flex items-center gap-2">
          <CalendarDays size={16} />
          {formatDate(game.game_date)}
        </p>
        <p className="flex items-center gap-2">
          <Clock3 size={16} />
          {game.start_time ? game.start_time.slice(0, 5) : "Horário a definir"}
        </p>
        <p className="flex items-center gap-2">
          <MapPin size={16} />
          {game.location || "Local a definir"}
        </p>
      </div>

      <AttendanceButtons game={game} />
    </article>
  );
}

function SectionTitle({
  eyebrow,
  title,
  icon,
}: {
  eyebrow: string;
  title: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[var(--brand)]">{icon}</span>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[var(--brand)]">
          {eyebrow}
        </p>
        <h2 className="text-xl font-black">{title}</h2>
      </div>
    </div>
  );
}

function PaymentGameCard({
  title,
  date,
  rows,
}: {
  title: string;
  date: string;
  rows: PlayerGamePaymentEntry[];
}) {
  const paid = rows.filter((row) => row.payment_status === "paid").length;

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] p-4">
        <div>
          <p className="font-bold">{title}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">{formatDate(date)}</p>
        </div>
        <span className="rounded-full bg-white/[.04] px-2.5 py-1 text-xs font-bold text-[var(--muted)]">
          {paid}/{rows.length} pagos
        </span>
      </div>
      <div className="divide-y divide-[var(--border)]">
        {rows.map((row, index) => (
          <div
            key={`${row.game_id}-${row.player_name}-${index}`}
            className="flex items-center justify-between gap-3 p-4"
          >
            <span className="min-w-0 flex-1 truncate font-semibold">
              {row.player_name}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                row.payment_status === "paid"
                  ? "bg-[var(--success)]/10 text-[var(--success)]"
                  : "bg-[var(--warning)]/10 text-[var(--warning)]"
              }`}
            >
              {row.payment_status === "paid" ? "Pago" : "Pendente"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PlayerAccountView({ data }: { data: PlayerAccountData }) {
  const {
    portal,
    games,
    finance,
    pendingPlayers,
    recentEvents,
    goalRanking,
    gameHistory,
    gamePayments,
  } = data;

  const [tab, setTab] = useState<PlayerTab>("home");

  const recentGame = recentEvents[0]
    ? {
        title: recentEvents[0].game_title,
        date: recentEvents[0].game_date,
      }
    : null;

  const groupedPayments = useMemo(() => {
    const groups = new Map<
      string,
      { title: string; date: string; rows: PlayerGamePaymentEntry[] }
    >();

    for (const row of gamePayments) {
      const existing = groups.get(row.game_id);
      if (existing) {
        existing.rows.push(row);
      } else {
        groups.set(row.game_id, {
          title: row.game_title,
          date: row.game_date,
          rows: [row],
        });
      }
    }

    return [...groups.entries()].map(([id, group]) => ({ id, ...group }));
  }, [gamePayments]);

  const navItems: {
    id: PlayerTab;
    label: string;
    icon: typeof House;
  }[] = [
    { id: "home", label: "Início", icon: House },
    { id: "games", label: "Jogos", icon: CalendarDays },
    { id: "ranking", label: "Ranking", icon: Trophy },
    { id: "finance", label: "Financeiro", icon: CircleDollarSign },
  ];

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 pb-32 pt-8 sm:pt-12">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[var(--brand)]">
            {portal.organization_name}
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-[-.04em] sm:text-4xl">
            Olá, {firstName(portal.player_name)} 👋
          </h1>
          <p className="mt-3 text-[var(--muted)]">
            Área do participante
          </p>
        </div>
        <form action={logoutPlayer}>
          <button
            aria-label="Sair"
            className="focus-ring grid size-11 place-items-center rounded-xl border border-[var(--border)] bg-white/5 text-[var(--muted)]"
          >
            <LogOut size={18} />
          </button>
        </form>
      </header>

      {tab === "home" ? (
        <>
          <section className="mt-8">
            {games[0] ? (
              <GameCard game={games[0]} featured />
            ) : (
              <div className="card px-5 py-10 text-center">
                <CalendarDays className="mx-auto text-[var(--muted)]" />
                <h2 className="mt-4 font-bold">
                  Nenhum jogo agendado no momento.
                </h2>
              </div>
            )}
          </section>

          <section className="mt-9 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTab("ranking")}
              className="card p-4 text-left"
            >
              <Trophy className="text-[var(--warning)]" size={20} />
              <p className="mt-3 text-sm font-bold">Artilharia</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {goalRanking[0]
                  ? `${goalRanking[0].player_name} · ${goalRanking[0].goals} gol${goalRanking[0].goals === 1 ? "" : "s"}`
                  : "Sem gols ainda"}
              </p>
            </button>
            <button
              type="button"
              onClick={() => setTab("finance")}
              className="card p-4 text-left"
            >
              <WalletCards className="text-[var(--brand)]" size={20} />
              <p className="mt-3 text-sm font-bold">Financeiro</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Caixa {formatCurrency(finance?.cash_balance ?? 0)}
              </p>
            </button>
          </section>

          <section className="mt-10">
            <SectionTitle
              eyebrow="Destaques"
              title="Último jogo com estatísticas"
              icon={<Trophy size={20} className="text-[var(--warning)]" />}
            />
            <div className="card mt-4">
              {recentGame ? (
                <>
                  <div className="border-b border-[var(--border)] p-4">
                    <p className="font-bold">{recentGame.title}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {formatDate(recentGame.date)}
                    </p>
                  </div>
                  <div className="divide-y divide-[var(--border)]">
                    {recentEvents.map((event) => (
                      <div
                        key={`${event.player_name}-${event.event_type}`}
                        className="flex items-center justify-between gap-4 p-4"
                      >
                        <span className="font-semibold">{event.player_name}</span>
                        <span className="text-sm font-bold">
                          {event.event_type === "goal"
                            ? `⚽ ${event.quantity} gol${event.quantity === 1 ? "" : "s"}`
                            : event.event_type === "yellow_card"
                              ? `🟨 ${event.quantity}`
                              : `🟥 ${event.quantity}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="p-8 text-center">
                  <ShieldCheck className="mx-auto text-[var(--muted)]" />
                  <p className="mt-3 text-sm text-[var(--muted)]">
                    Ainda não há gols ou cartões registrados.
                  </p>
                </div>
              )}
            </div>
          </section>
        </>
      ) : null}

      {tab === "games" ? (
        <section className="mt-8">
          <SectionTitle
            eyebrow="Calendário"
            title="Jogos"
            icon={<CalendarDays size={20} />}
          />

          <div className="mt-5">
            <h3 className="text-sm font-black uppercase tracking-[.14em] text-[var(--muted)]">
              Próximos jogos
            </h3>
            <div className="mt-3 grid gap-4">
              {games.length ? (
                games.map((game, index) => (
                  <GameCard key={game.game_id} game={game} featured={index === 0} />
                ))
              ) : (
                <div className="card p-6 text-sm text-[var(--muted)]">
                  Nenhum jogo agendado.
                </div>
              )}
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-sm font-black uppercase tracking-[.14em] text-[var(--muted)]">
              Jogos anteriores
            </h3>
            <div className="mt-3 grid gap-3">
              {gameHistory.length ? (
                gameHistory.map((game) => (
                  <article key={game.game_id} className="card p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-bold">{game.title}</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          {formatDate(game.game_date)}
                          {game.start_time
                            ? ` · ${game.start_time.slice(0, 5)}`
                            : ""}
                        </p>
                        {game.location ? (
                          <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--muted)]">
                            <MapPin size={13} />
                            {game.location}
                          </p>
                        ) : null}
                      </div>
                      <span className="rounded-full bg-white/[.04] px-2.5 py-1 text-[10px] font-bold text-[var(--muted)]">
                        {game.status === "canceled" ? "Cancelado" : "Finalizado"}
                      </span>
                    </div>
                  </article>
                ))
              ) : (
                <div className="card p-6 text-sm text-[var(--muted)]">
                  Nenhum jogo anterior ainda.
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {tab === "ranking" ? (
        <section className="mt-8">
          <SectionTitle
            eyebrow="Artilharia"
            title="Ranking de gols"
            icon={<Trophy size={20} className="text-[var(--warning)]" />}
          />
          <p className="mt-2 text-sm text-[var(--muted)]">
            Participantes, convidados e jogadores avulsos entram no mesmo ranking.
          </p>

          <div className="card mt-5 overflow-hidden">
            {goalRanking.length ? (
              <div className="divide-y divide-[var(--border)]">
                {goalRanking.map((player, index) => (
                  <div
                    key={player.player_key}
                    className="flex items-center gap-3 p-4"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[.04] text-sm font-black text-[var(--muted)]">
                      {index === 0 ? "👑" : `${index + 1}º`}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{player.player_name}</p>
                      <p className="mt-0.5 text-xs text-[var(--muted)]">
                        {player.player_key.startsWith("guest:")
                          ? "Convidado / jogador avulso"
                          : "Participante"}
                      </p>
                    </div>
                    <div className="text-right">
                      <strong className="text-2xl font-black text-[var(--brand)]">
                        {player.goals}
                      </strong>
                      <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
                        {player.goals === 1 ? "gol" : "gols"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="p-6 text-sm text-[var(--muted)]">
                Ainda não há gols registrados.
              </p>
            )}
          </div>
        </section>
      ) : null}

      {tab === "finance" ? (
        <section className="mt-8">
          <SectionTitle
            eyebrow="Transparência"
            title="Financeiro do grupo"
            icon={<WalletCards size={20} />}
          />

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {portal.show_cash_balance ? (
              <div className="card p-5">
                <p className="text-xs text-[var(--muted)]">Caixa atual</p>
                <strong className="mt-2 block text-2xl">
                  {formatCurrency(finance?.cash_balance ?? 0)}
                </strong>
              </div>
            ) : null}
            {portal.show_receivables ? (
              <div className="card p-5">
                <p className="text-xs text-[var(--muted)]">A receber</p>
                <strong className="mt-2 block text-2xl text-[var(--warning)]">
                  {formatCurrency(finance?.receivables ?? 0)}
                </strong>
              </div>
            ) : null}
            {portal.show_payables ? (
              <div className="card p-5">
                <p className="text-xs text-[var(--muted)]">A pagar</p>
                <strong className="mt-2 block text-2xl text-[var(--danger)]">
                  {formatCurrency(finance?.payables ?? 0)}
                </strong>
              </div>
            ) : null}
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-black">Pagamentos por jogo</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Veja quem já pagou e quem ainda está pendente.
            </p>
            <div className="mt-4 grid gap-4">
              {groupedPayments.length ? (
                groupedPayments.map((group) => (
                  <PaymentGameCard
                    key={group.id}
                    title={group.title}
                    date={group.date}
                    rows={group.rows}
                  />
                ))
              ) : (
                <div className="card p-6 text-sm text-[var(--muted)]">
                  Ainda não há cobranças de jogos para exibir.
                </div>
              )}
            </div>
          </div>

          {portal.show_pending_players ? (
            <div className="card mt-8 divide-y divide-[var(--border)]">
              <div className="p-4">
                <h3 className="font-bold">Pendências do grupo</h3>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Valores ainda em aberto.
                </p>
              </div>
              {pendingPlayers.length ? (
                pendingPlayers.map((player) => (
                  <div
                    key={player.player_name}
                    className="flex items-center justify-between gap-4 p-4"
                  >
                    <span className="font-semibold">{player.player_name}</span>
                    {portal.show_individual_values ? (
                      <strong className="text-[var(--warning)]">
                        {formatCurrency(player.amount ?? 0)}
                      </strong>
                    ) : (
                      <span className="text-xs font-bold text-[var(--warning)]">
                        Pendente
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <p className="p-5 text-sm text-[var(--muted)]">
                  Nenhuma pendência no momento.
                </p>
              )}
            </div>
          ) : null}
        </section>
      ) : null}

      <nav className="mobile-bottom-nav flex justify-around rounded-[1.4rem] border border-[var(--border-strong)] bg-[#07142b]/95 p-2 shadow-[0_16px_50px_rgba(0,0,0,.55)] backdrop-blur-2xl">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setTab(id);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className={`focus-ring flex min-w-16 flex-col items-center gap-1.5 rounded-xl px-2 py-2 text-[10px] font-semibold transition ${
              tab === id
                ? "bg-white/[.06] text-[var(--brand)]"
                : "text-[var(--muted)]"
            }`}
          >
            <Icon size={20} />
            {label}
          </button>
        ))}
      </nav>
    </main>
  );
}
