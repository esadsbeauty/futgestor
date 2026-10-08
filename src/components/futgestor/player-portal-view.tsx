"use client";

import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  UserRound,
  WalletCards,
  XCircle,
} from "lucide-react";
import { useActionState } from "react";
import {
  respondGameAttendance,
  type GameAttendanceActionState,
} from "@/lib/mutations/player-portal";
import { formatCurrency, formatDate, firstName } from "@/lib/formatters";
import type {
  GameAttendanceStatus,
  PlayerPortal,
  PlayerPortalGame,
} from "@/types/player-portal";

const time = (value: string | null) =>
  value ? value.slice(0, 5) : "Horário a definir";

const initialAttendanceState: GameAttendanceActionState = {
  ok: false,
};

function AttendanceControls({
  game,
  token,
}: {
  game: PlayerPortalGame;
  token: string;
}) {
  const [state, action, pending] = useActionState(
    respondGameAttendance,
    initialAttendanceState
  );

  const currentStatus =
    state.ok && state.status
      ? state.status
      : game.attendance_status;

  const statusConfig: Record<
    GameAttendanceStatus,
    {
      label: string;
      className: string;
    }
  > = {
    pending: {
      label: "Pendente",
      className: "text-[var(--warning)]",
    },
    confirmed: {
      label: "Presença confirmada",
      className: "text-[var(--success)]",
    },
    declined: {
      label: "Não vou",
      className: "text-[var(--danger)]",
    },
  };

  return (
    <div className="mt-5 border-t border-[var(--border)] pt-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-[var(--muted)]">
            Sua presença
          </p>

          <p
            className={`mt-1 text-sm font-bold ${statusConfig[currentStatus].className}`}
          >
            {statusConfig[currentStatus].label}
          </p>
        </div>

        {currentStatus === "confirmed" && (
          <CheckCircle2
            size={22}
            className="text-[var(--success)]"
          />
        )}

        {currentStatus === "declined" && (
          <XCircle
            size={22}
            className="text-[var(--danger)]"
          />
        )}
      </div>

      <p className="mt-4 text-sm font-semibold">
        Você vai jogar?
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <form action={action}>
          <input
            type="hidden"
            name="token"
            value={token}
          />

          <input
            type="hidden"
            name="game_id"
            value={game.game_id}
          />

          <input
            type="hidden"
            name="status"
            value="confirmed"
          />

          <button
            type="submit"
            disabled={
              pending ||
              currentStatus === "confirmed"
            }
            className="focus-ring min-h-11 w-full rounded-xl bg-[var(--success)] px-4 text-sm font-bold text-[#02150d] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? "Salvando..." : "Vou jogar"}
          </button>
        </form>

        <form action={action}>
          <input
            type="hidden"
            name="token"
            value={token}
          />

          <input
            type="hidden"
            name="game_id"
            value={game.game_id}
          />

          <input
            type="hidden"
            name="status"
            value="declined"
          />

          <button
            type="submit"
            disabled={
              pending ||
              currentStatus === "declined"
            }
            className="focus-ring min-h-11 w-full rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-4 text-sm font-bold text-[var(--danger)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? "Salvando..." : "Não vou"}
          </button>
        </form>
      </div>

      {state.message && !state.ok && (
        <p
          role="alert"
          className="mt-3 text-sm text-[var(--danger)]"
        >
          {state.message}
        </p>
      )}
    </div>
  );
}

function GameCard({
  game,
  featured = false,
  showPrice,
  token,
}: {
  game: PlayerPortalGame;
  featured?: boolean;
  showPrice: boolean;
  token: string;
}) {
  return (
    <article
      className={`${
        featured
          ? "glow-card border-[var(--brand)]/25"
          : ""
      } card p-5`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[var(--brand)]">
            {featured
              ? "Próximo jogo"
              : "Jogo agendado"}
          </p>

          <h3 className="mt-2 text-xl font-black">
            {game.title}
          </h3>
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
          {time(game.start_time)}
        </p>

        <p className="flex items-center gap-2">
          <MapPin size={16} />
          {game.location || "Local a definir"}
        </p>
      </div>

      {showPrice && (
        <p className="mt-5 border-t border-[var(--border)] pt-4 text-sm text-[var(--muted)]">
          Valor deste jogo:{" "}
          <strong className="text-[var(--warning)]">
            {formatCurrency(game.player_price)}
          </strong>
        </p>
      )}

      <AttendanceControls
        game={game}
        token={token}
      />
    </article>
  );
}

export function PlayerPortalView({
  portal,
  games,
  token,
}: {
  portal: PlayerPortal;
  games: PlayerPortalGame[];
  token: string;
}) {
  const isMonthly =
    portal.billing_type === "monthly";

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-10 sm:py-14">
      <header>
        <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[var(--brand)]">
          {portal.organization_name}
        </p>

        <h1 className="mt-3 text-3xl font-black tracking-[-.04em] sm:text-4xl">
          Olá, {firstName(portal.player_name)} 👋
        </h1>

        <p className="mt-3 text-[var(--muted)]">
          Bem-vindo ao seu espaço no FutGestor.
        </p>
      </header>

      <section className="mt-8">
        {games[0] ? (
          <GameCard
            game={games[0]}
            featured
            showPrice={!isMonthly}
            token={token}
          />
        ) : (
          <div className="card px-5 py-10 text-center">
            <CalendarDays className="mx-auto text-[var(--muted)]" />

            <h2 className="mt-4 font-bold">
              Nenhum jogo agendado no momento.
            </h2>

            <p className="mt-2 text-sm text-[var(--muted)]">
              Quando um novo jogo for marcado, ele aparecerá aqui.
            </p>
          </div>
        )}
      </section>

      {games.length > 1 && (
        <section className="mt-9">
          <h2 className="text-xl font-black">
            Meus próximos jogos
          </h2>

          <div className="mt-4 grid gap-4">
            {games.slice(1).map((game) => (
              <GameCard
                key={game.game_id}
                game={game}
                showPrice={!isMonthly}
                token={token}
              />
            ))}
          </div>
        </section>
      )}

      <div className="mt-9 grid gap-4 sm:grid-cols-2">
        <section className="card p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[var(--brand)]/10 text-[var(--brand)]">
              <UserRound size={19} />
            </span>

            <div>
              <p className="text-xs text-[var(--muted)]">
                Minha situação
              </p>

              <h2 className="font-bold">
                Participante ativo
              </h2>
            </div>
          </div>

          <dl className="mt-5 space-y-3 border-t border-[var(--border)] pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-[var(--muted)]">
                Tipo
              </dt>

              <dd className="font-semibold">
                {isMonthly
                  ? "Mensalista"
                  : "Por jogo"}
              </dd>
            </div>

            {isMonthly && (
              <>
                <div className="flex justify-between">
                  <dt className="text-[var(--muted)]">
                    Mensalidade
                  </dt>

                  <dd className="font-semibold">
                    {formatCurrency(
                      portal.monthly_fee ?? 0
                    )}
                  </dd>
                </div>

                <div className="flex justify-between">
                  <dt className="text-[var(--muted)]">
                    Vencimento
                  </dt>

                  <dd className="font-semibold">
                    Dia {portal.due_day}
                  </dd>
                </div>
              </>
            )}
          </dl>
        </section>

        <section className="card p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[var(--brand)]/10 text-[var(--brand)]">
              <WalletCards size={19} />
            </span>

            <div>
              <p className="text-xs text-[var(--muted)]">
                Sobre o grupo
              </p>

              <h2 className="font-bold">
                {portal.organization_name}
              </h2>
            </div>
          </div>

          <p className="mt-5 border-t border-[var(--border)] pt-4 text-sm text-[var(--muted)]">
            Participante desde{" "}
            <strong className="text-white">
              {portal.participant_since
                ? formatDate(
                    portal.participant_since
                  )
                : "—"}
            </strong>
          </p>
        </section>
      </div>

      <footer className="py-8 text-center text-xs text-[var(--muted)]">
        FutGestor · Seu baba organizado
      </footer>
    </main>
  );
}