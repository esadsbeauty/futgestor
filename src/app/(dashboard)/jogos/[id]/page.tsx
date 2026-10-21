import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  MapPin,
  Trash2,
  XCircle,
} from "lucide-react";
import {
  EditGameForm,
  ExpenseForm,
  GameEventForm,
  GameLifecycleActions,
} from "@/components/futgestor/game-detail-actions";
import { GameSummary } from "@/components/futgestor/game-summary";
import { PublicGameInviteCard } from "@/components/futgestor/public-game-invite-card";
import { OwnGameAttendanceCard } from "@/components/futgestor/own-game-attendance-card";
import {
  formatCurrency,
  formatDate,
} from "@/lib/formatters";
import { gameFinancialSummary } from "@/lib/games";
import { gameEventPlayers } from "@/lib/game-event-players";
import {
  payGameExpense,
  removeGameEvent,
} from "@/lib/mutations/games";
import {
  getEligiblePlayersForGame,
  getGameAttendanceSummary,
  getGameById,
  getGameEvents,
  getGameExpenses,
  getGameGuestConfirmations,
  getGameRosterPlayers,
} from "@/lib/queries/games";
import { getCurrentOrganizationForUser } from "@/lib/queries/participants";

export const dynamic = "force-dynamic";

const statusLabel = {
  scheduled: "Agendado",
  completed: "Concluído",
  canceled: "Cancelado",
};

const attendanceLabel = {
  confirmed: "Confirmado",
  pending: "Pendente",
  declined: "Não vai",
};

export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const o =
    await getCurrentOrganizationForUser();

  const game = await getGameById(o.id, id);

  const [
    expenses,
    eligible,
    attendance,
    events,
    guestConfirmations,
    rosterPlayers,
  ] = await Promise.all([
    getGameExpenses(o.id, id),
    getEligiblePlayersForGame(
      o.id,
      o.billing_mode,
      id
    ),
    getGameAttendanceSummary(o.id, id),
    getGameEvents(o.id, id),
    getGameGuestConfirmations(o.id, id),
    getGameRosterPlayers(o.id, id),
  ]);

  const rosterExpected = rosterPlayers
    .filter((player) => player.attendance_status === "confirmed")
    .reduce((total, player) => total + Number(player.amount ?? 0), 0);

  const rosterReceived = rosterPlayers
    .filter(
      (player) =>
        player.attendance_status === "confirmed" &&
        player.payment_status === "paid"
    )
    .reduce((total, player) => total + Number(player.amount ?? 0), 0);

  const summary = gameFinancialSummary(
    [],
    expenses,
    rosterExpected,
    rosterReceived
  );

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/jogos"
        className="inline-flex items-center gap-2 text-sm text-[var(--muted)]"
      >
        <ArrowLeft size={16} />
        Voltar
      </Link>

      <header className="card mt-5 p-5 sm:p-7">
        <div className="flex flex-col justify-between gap-5 sm:flex-row">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[var(--brand)]">
              {formatDate(game.game_date)}{" "}
              {game.start_time
                ? `· ${game.start_time.slice(0, 5)}`
                : ""}
            </p>

            <h1 className="mt-2 text-3xl font-black">
              {game.title}
            </h1>

            {game.location && (
              <p className="mt-2 flex items-center gap-2 text-[var(--muted)]">
                <MapPin size={16} />
                {game.location}
              </p>
            )}

            <span className="mt-4 inline-flex rounded-full border border-[var(--brand)]/20 bg-[var(--brand)]/10 px-3 py-1 text-xs font-bold text-[var(--brand)]">
              {statusLabel[game.status]}
            </span>
          </div>

          <div>
            <EditGameForm game={game} />
            <GameLifecycleActions gameId={game.id} status={game.status} />
          </div>
        </div>
      </header>

      <div className="mt-5">
        <GameSummary summary={summary} />
      </div>

      <PublicGameInviteCard
        game={game}
        confirmations={rosterPlayers}
        appUrl={process.env.NEXT_PUBLIC_APP_URL ?? ""}
        billingMode={o.billing_mode}
        eligiblePlayers={eligible}
      />

      <section className="mt-10">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[var(--brand)]">
            Participação
          </p>

          <h2 className="mt-2 text-xl font-black">
            Presenças
          </h2>

          <p className="mt-1 text-sm text-[var(--muted)]">
            Acompanhe quem confirmou, quem ainda
            não respondeu e quem informou que não
            vai.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="card p-4 text-center">
            <CheckCircle2
              className="mx-auto text-[var(--success)]"
              size={21}
            />

            <strong className="mt-2 block text-2xl">
              {attendance.confirmed}
            </strong>

            <span className="text-xs text-[var(--muted)]">
              Confirmados
            </span>
          </div>

          <div className="card p-4 text-center">
            <Clock3
              className="mx-auto text-[var(--warning)]"
              size={21}
            />

            <strong className="mt-2 block text-2xl">
              {attendance.pending}
            </strong>

            <span className="text-xs text-[var(--muted)]">
              Pendentes
            </span>
          </div>

          <div className="card p-4 text-center">
            <XCircle
              className="mx-auto text-[var(--danger)]"
              size={21}
            />

            <strong className="mt-2 block text-2xl">
              {attendance.declined}
            </strong>

            <span className="text-xs text-[var(--muted)]">
              Não vão
            </span>
          </div>
        </div>

        {attendance.players
          .filter((player) => player.is_current_user)
          .map((player) => (
            <OwnGameAttendanceCard
              key={player.player_id}
              gameId={id}
              gameFormat={game.game_format}
              player={player}
            />
          ))}

        <div className="card mt-4 divide-y divide-[var(--border)]">
          {attendance.players.length ? (
            attendance.players.map((player) => (
              <article
                key={player.player_id}
                className="flex items-center justify-between gap-4 p-4"
              >
                <div>
                  <p className="font-bold">
                    {player.player_name}
                  </p>

                  {player.responded_at && (
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Respondeu pelo portal
                    </p>
                  )}
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    player.status ===
                    "confirmed"
                      ? "bg-[var(--success)]/10 text-[var(--success)]"
                      : player.status ===
                          "declined"
                        ? "bg-[var(--danger)]/10 text-[var(--danger)]"
                        : "bg-[var(--warning)]/10 text-[var(--warning)]"
                  }`}
                >
                  {
                    attendanceLabel[
                      player.status
                    ]
                  }
                </span>
              </article>
            ))
          ) : (
            <p className="p-8 text-center text-[var(--muted)]">
              Nenhum participante ativo.
            </p>
          )}
        </div>
      </section>

      <section className="mt-10">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[var(--brand)]">
            Destaques
          </p>
          <h2 className="mt-2 text-xl font-black">Gols e cartões</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Registre os principais acontecimentos do jogo.
          </p>
        </div>

        <GameEventForm
          game={id}
          players={gameEventPlayers(attendance.players, guestConfirmations)}
        />

        <div className="card mt-4 divide-y divide-[var(--border)]">
          {events.length ? (
            events.map((event) => (
              <article
                key={event.id}
                className="flex items-center gap-3 p-4"
              >
                <div className="flex-1">
                  <p className="font-bold">{event.playerName}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {event.event_type === "goal"
                      ? `⚽ ${event.quantity} gol${event.quantity === 1 ? "" : "s"}`
                      : event.event_type === "yellow_card"
                        ? `🟨 ${event.quantity} cartão amarelo${event.quantity === 1 ? "" : "s"}`
                        : `🟥 ${event.quantity} cartão vermelho${event.quantity === 1 ? "" : "s"}`}
                  </p>
                </div>

                <form action={removeGameEvent}>
                  <input type="hidden" name="event_id" value={event.id} />
                  <input type="hidden" name="game_id" value={id} />
                  <button
                    aria-label="Remover destaque"
                    className="p-2 text-[var(--danger)]"
                  >
                    <Trash2 size={17} />
                  </button>
                </form>
              </article>
            ))
          ) : (
            <p className="p-8 text-center text-[var(--muted)]">
              Nenhum destaque registrado.
            </p>
          )}
        </div>
      </section>

      <section className="mt-10 pb-8">
        <h2 className="text-xl font-black">
          Despesas do jogo
        </h2>

        <ExpenseForm game={id} />

        <div className="card mt-4 divide-y divide-[var(--border)]">
          {expenses.length ? (
            expenses.map((e) => (
              <article
                key={e.id}
                className="flex items-center gap-3 p-4"
              >
                <div className="flex-1">
                  <p className="font-bold">
                    {e.description}
                  </p>

                  <p
                    className={`text-xs ${
                      e.status === "paid"
                        ? "text-[var(--success)]"
                        : "text-[var(--warning)]"
                    }`}
                  >
                    {e.status === "paid"
                      ? "Paga"
                      : "Pendente"}
                  </p>
                </div>

                <strong>
                  {formatCurrency(e.amount)}
                </strong>

                {e.status === "pending" && (
                  <form
                    action={payGameExpense}
                  >
                    <input
                      type="hidden"
                      name="expense_id"
                      value={e.id}
                    />

                    <input
                      type="hidden"
                      name="game_id"
                      value={id}
                    />

                    <button className="rounded-xl bg-[var(--success)] px-3 py-2 text-xs font-bold text-[#02150d]">
                      Marcar como paga
                    </button>
                  </form>
                )}
              </article>
            ))
          ) : (
            <p className="p-8 text-center text-[var(--muted)]">
              Nenhuma despesa cadastrada.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
