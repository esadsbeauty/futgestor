"use client";

import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  LogOut,
  MapPin,
  ShieldCheck,
  Trophy,
  WalletCards,
  XCircle,
} from "lucide-react";
import { useActionState } from "react";
import {
  logoutPlayer,
  respondMyGameAttendance,
  type PlayerAccountActionState,
} from "@/lib/mutations/player-account";
import { formatCurrency, formatDate, firstName } from "@/lib/formatters";
import type { PlayerAccountData, PlayerAccountGame } from "@/types/player-account";

const initialState: PlayerAccountActionState = { ok: false };

function AttendanceButtons({ game }: { game: PlayerAccountGame }) {
  const [state, action, pending] = useActionState(
    respondMyGameAttendance,
    initialState
  );

  const status = state.ok && state.status ? state.status : game.attendance_status;

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

      <div className="mt-4 grid grid-cols-2 gap-3">
        <form action={action}>
          <input type="hidden" name="game_id" value={game.game_id} />
          <input type="hidden" name="status" value="confirmed" />
          <button
            disabled={pending || status === "confirmed"}
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

function GameCard({ game, featured = false }: { game: PlayerAccountGame; featured?: boolean }) {
  return (
    <article className={`${featured ? "glow-card border-[var(--brand)]/25" : ""} card p-5`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[var(--brand)]">
            {featured ? "Próximo jogo" : "Jogo agendado"}
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

export function PlayerAccountView({ data }: { data: PlayerAccountData }) {
  const { portal, games, finance, pendingPlayers, recentEvents } = data;

  const recentGame = recentEvents[0]
    ? {
        title: recentEvents[0].game_title,
        date: recentEvents[0].game_date,
      }
    : null;

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 py-10 sm:py-14">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[var(--brand)]">
            {portal.organization_name}
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-[-.04em] sm:text-4xl">
            Olá, {firstName(portal.player_name)} 👋
          </h1>
          <p className="mt-3 text-[var(--muted)]">
            Sua área pessoal no FutGestor.
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

      <section className="mt-8">
        {games[0] ? (
          <GameCard game={games[0]} featured />
        ) : (
          <div className="card px-5 py-10 text-center">
            <CalendarDays className="mx-auto text-[var(--muted)]" />
            <h2 className="mt-4 font-bold">Nenhum jogo agendado no momento.</h2>
          </div>
        )}
      </section>

      {games.length > 1 ? (
        <section className="mt-9">
          <h2 className="text-xl font-black">Próximos jogos</h2>
          <div className="mt-4 grid gap-4">
            {games.slice(1).map((game) => (
              <GameCard key={game.game_id} game={game} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-10">
        <div className="flex items-center gap-3">
          <WalletCards className="text-[var(--brand)]" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[var(--brand)]">
              Transparência
            </p>
            <h2 className="text-xl font-black">Financeiro do grupo</h2>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
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

        {portal.show_pending_players ? (
          <div className="card mt-4 divide-y divide-[var(--border)]">
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
                      {formatCurrency(player.amount)}
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

      <section className="mt-10">
        <div className="flex items-center gap-3">
          <Trophy className="text-[var(--warning)]" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[var(--brand)]">
              Destaques
            </p>
            <h2 className="text-xl font-black">Último jogo com estatísticas</h2>
          </div>
        </div>

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

      <footer className="py-8 text-center text-xs text-[var(--muted)]">
        FutGestor · Seu baba organizado
      </footer>
    </main>
  );
}
