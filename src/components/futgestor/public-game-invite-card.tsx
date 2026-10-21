"use client";

import {
  CheckCircle2,
  CircleDollarSign,
  Clipboard,
  Copy,
  Pencil,
  Save,
  Shuffle,
  Trash2,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import { useActionState, useState } from "react";
import {
  drawPublicGameTeams,
  markGameRosterPlayerPaid,
  promoteGameGuestToParticipant,
  removePublicGameConfirmation,
  updatePublicGameConfirmation,
  updateGamePlayerTeam,
  type GameActionState,
  type GuestPromotionActionState,
} from "@/lib/mutations/games";
import type { BillingMode } from "@/types/billing";
import { AddPlayersForm } from "@/components/futgestor/game-detail-actions";
import type { Participant } from "@/types/participants";
import type {
  Game,
  GameRosterPlayer,
  GuestPosition,
  GuestSportType,
} from "@/types/games";

const initialState: GameActionState = { ok: false };
const promotionInitialState: GuestPromotionActionState = { ok: false };

const sportTypeLabels = {
  futsal: "Futsal",
  football: "Futebol",
} as const;

const positionLabels: Record<GuestPosition, string> = {
  goalkeeper: "Goleiro",
  fixed: "Fixo",
  winger: "Ala / Ponta",
  pivot: "Pivô",
  full_back: "Lateral",
  center_back: "Zagueiro",
  defensive_mid: "Volante",
  midfielder: "Meio-campo",
  striker: "Atacante",
  other: "Outra",
};

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

function PromoteGuestForm({
  player,
  gameId,
  billingMode,
  onClose,
}: {
  player: GameRosterPlayer;
  gameId: string;
  billingMode: BillingMode;
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState(
    promoteGameGuestToParticipant,
    promotionInitialState
  );

  const copyAccess = async () => {
    if (!state.email || !state.temporaryPassword) return;
    const loginUrl = `${window.location.origin}/login`;
    await navigator.clipboard.writeText(
      `Acesso ao FutGestor\nE-mail: ${state.email}\nSenha temporária: ${state.temporaryPassword}\nEntrar: ${loginUrl}\nNo primeiro acesso, crie uma nova senha.`
    );
  };

  if (state.ok && state.temporaryPassword) {
    return (
      <div className="rounded-2xl border border-[var(--success)]/30 bg-[var(--success)]/5 p-4">
        <p className="text-xs font-bold uppercase tracking-[.14em] text-[var(--success)]">
          Participante criado
        </p>
        <p className="mt-2 text-sm font-bold">{player.name}</p>
        <div className="mt-3 rounded-xl border border-[var(--border)] bg-black/10 p-3 text-sm">
          <p>
            <span className="text-[var(--muted)]">E-mail:</span>{" "}
            {state.email}
          </p>
          <p className="mt-1 break-all">
            <span className="text-[var(--muted)]">Senha temporária:</span>{" "}
            <strong>{state.temporaryPassword}</strong>
          </p>
        </div>
        <p className="mt-3 text-xs text-[var(--muted)]">
          Essa senha é exibida apenas agora. No primeiro login, o jogador será
          obrigado a criar uma nova senha.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={copyAccess}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--brand)] px-3 text-xs font-bold text-[#01111d]"
          >
            <Copy size={15} />
            Copiar acesso
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border)] px-3 text-xs font-bold"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      action={action}
      className="rounded-2xl border border-[var(--brand)]/30 bg-[var(--brand)]/5 p-4"
    >
      <input type="hidden" name="confirmation_id" value={player.guest_confirmation_id ?? ""} />
      <input type="hidden" name="game_id" value={gameId} />

      <p className="text-sm font-black">Transformar em participante</p>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Crie o cadastro permanente e um acesso com senha temporária.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="text-xs text-[var(--muted)]">E-mail</span>
          <input
            name="email"
            type="email"
            className="input"
            required
            placeholder="jogador@email.com"
          />
          {state.fieldErrors?.email?.[0] ? (
            <small className="mt-1 block text-[var(--danger)]">
              {state.fieldErrors.email[0]}
            </small>
          ) : null}
        </label>

        <label>
          <span className="text-xs text-[var(--muted)]">WhatsApp</span>
          <input
            name="phone"
            className="input"
            placeholder="Opcional"
          />
        </label>

        <label>
          <span className="text-xs text-[var(--muted)]">Cobrança</span>
          <select
            name="billing_type"
            className="input"
            defaultValue={billingMode === "monthly" ? "monthly" : "per_game"}
          >
            {billingMode !== "per_game" ? (
              <option value="monthly">Mensalista</option>
            ) : null}
            {billingMode !== "monthly" ? (
              <option value="per_game">Por jogo</option>
            ) : null}
          </select>
        </label>
      </div>

      {state.message ? (
        <p className="mt-3 text-sm text-[var(--danger)]">{state.message}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          disabled={pending}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--brand)] px-3 text-xs font-bold text-[#01111d] disabled:opacity-60"
        >
          <UserPlus size={15} />
          {pending ? "Criando..." : "Criar participante e acesso"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border)] px-3 text-xs font-bold"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function MoveTeamButton({
  player,
  gameId,
}: {
  player: GameRosterPlayer;
  gameId: string;
}) {
  if (!player.team_number) return null;
  const target = player.team_number === 1 ? 2 : 1;

  return (
    <form action={updateGamePlayerTeam}>
      <input type="hidden" name="roster_id" value={player.id} />
      <input type="hidden" name="game_id" value={gameId} />
      <input type="hidden" name="team_number" value={target} />
      <button
        className="min-h-10 rounded-xl border border-[var(--border)] px-3 text-xs font-bold text-[var(--brand)]"
        title={`Mover para o Time ${target}`}
      >
        Mover p/ Time {target}
      </button>
    </form>
  );
}

function PlayerRow({
  player,
  gameId,
  billingMode,
}: {
  player: GameRosterPlayer;
  gameId: string;
  billingMode: BillingMode;
}) {
  const [editing, setEditing] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [sportType, setSportType] = useState<GuestSportType | "">(
    player.sport_type ?? ""
  );
  const [attendanceStatus, setAttendanceStatus] = useState(
    player.attendance_status
  );
  const [state, action, pending] = useActionState(
    updatePublicGameConfirmation,
    initialState
  );

  const positions =
    sportType === "futsal"
      ? futsalPositions
      : sportType === "football"
        ? footballPositions
        : [];

  if (player.source === "participant") {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-white/[.025] p-3">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span className="block break-words text-sm font-bold leading-tight">
              {player.name}
            </span>
            <span className="mt-1 block text-xs leading-snug text-[var(--muted)]">
              {player.position
                ? `${player.sport_type ? sportTypeLabels[player.sport_type] + " · " : ""}${positionLabels[player.position]}`
                : "Participante confirmado"}
            </span>
          </div>
          <span className="shrink-0 rounded-full bg-[var(--brand)]/10 px-2 py-1 text-[10px] font-bold text-[var(--brand)]">
            Participante
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {player.payment_status === "paid" ? (
            <span className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--success)]/10 px-3 text-xs font-bold text-[var(--success)]">
              <CheckCircle2 size={15} />
              Pago
            </span>
          ) : player.payment_status === "pending" ? (
            <form action={markGameRosterPlayerPaid} className="min-w-0 flex-1">
              <input type="hidden" name="roster_id" value={player.id} />
              <input type="hidden" name="game_id" value={gameId} />
              <button className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--success)]/30 px-3 text-xs font-bold text-[var(--success)]">
                <CircleDollarSign size={15} />
                Marcar pago
              </button>
            </form>
          ) : (
            <span className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl bg-white/[.03] px-3 text-xs font-bold text-[var(--muted)]">
              Sem cobrança
            </span>
          )}
          <MoveTeamButton player={player} gameId={gameId} />
        </div>
      </div>
    );
  }

  if (promoting) {
    return (
      <PromoteGuestForm
        player={player}
        gameId={gameId}
        billingMode={billingMode}
        onClose={() => setPromoting(false)}
      />
    );
  }

  if (editing) {
    return (
      <form
        action={action}
        className="rounded-2xl border border-[var(--border)] bg-white/[.025] p-4"
      >
        <input type="hidden" name="confirmation_id" value={player.guest_confirmation_id ?? ""} />
        <input type="hidden" name="game_id" value={gameId} />

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="text-xs text-[var(--muted)]">Nome</span>
            <input
              name="name"
              defaultValue={player.name}
              className="input"
              required
            />
          </label>

          <label>
            <span className="text-xs text-[var(--muted)]">Presença</span>
            {player.payment_status === "paid" ? (
              <>
                <input type="hidden" name="attendance_status" value="confirmed" />
                <div className="input flex items-center text-sm text-[var(--success)]">
                  Confirmado · pagamento registrado
                </div>
              </>
            ) : (
              <select
                name="attendance_status"
                className="input"
                value={attendanceStatus}
                onChange={(event) => {
                  const value = event.target.value as "confirmed" | "declined";
                  setAttendanceStatus(value);
                  if (value === "declined") setSportType("");
                }}
              >
                <option value="confirmed">Vai</option>
                <option value="declined">Não vai</option>
              </select>
            )}
          </label>

          {attendanceStatus === "confirmed" ? (
            <label>
              <span className="text-xs text-[var(--muted)]">Tipo de jogo</span>
              <select
                name="sport_type"
                className="input"
                value={sportType}
                onChange={(event) =>
                  setSportType(event.target.value as GuestSportType | "")
                }
                required
              >
                <option value="" disabled>
                  Selecione
                </option>
                <option value="futsal">Futsal</option>
                <option value="football">Futebol de campo</option>
              </select>
            </label>
          ) : null}

          {attendanceStatus === "confirmed" ? (
            <label className="sm:col-span-2">
              <span className="text-xs text-[var(--muted)]">Posição</span>
              <select
                key={sportType}
                name="position"
                className="input"
                defaultValue={
                  player.sport_type === sportType ? player.position ?? "" : ""
                }
                disabled={!sportType}
                required
              >
                <option value="" disabled>
                  {sportType ? "Selecione" : "Escolha o tipo de jogo"}
                </option>
                {positions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        {state.message ? (
          <p
            className={`mt-3 text-sm ${
              state.ok ? "text-[var(--success)]" : "text-[var(--danger)]"
            }`}
          >
            {state.message}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            disabled={pending}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--brand)] px-3 text-xs font-bold text-[#01111d] disabled:opacity-60"
          >
            <Save size={15} />
            {pending ? "Salvando..." : "Salvar"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border)] px-3 text-xs font-bold"
          >
            <X size={15} />
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white/[.025] p-3">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className="block break-words text-sm font-bold leading-tight">
            {player.name}
          </span>
          <span className="mt-1 block text-xs leading-snug text-[var(--muted)]">
            {player.sport_type && player.position
              ? `${sportTypeLabels[player.sport_type]} · ${positionLabels[player.position]}`
              : "Não vai"}
          </span>
        </div>

        {player.payment_status === "paid" ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--success)]/10 px-2 py-1 text-[10px] font-bold text-[var(--success)]">
            <CheckCircle2 size={13} />
            Pago
          </span>
        ) : player.player_id ? (
          <span className="shrink-0 rounded-full bg-[var(--success)]/10 px-2 py-1 text-[10px] font-bold text-[var(--success)]">
            Participante
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex items-center gap-2">
        {player.attendance_status === "confirmed" &&
        player.payment_status !== "paid" ? (
          <form action={markGameRosterPlayerPaid} className="min-w-0 flex-1">
            <input type="hidden" name="roster_id" value={player.id} />
            <input type="hidden" name="game_id" value={gameId} />
            <button
              className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--success)]/30 px-3 text-xs font-bold text-[var(--success)]"
              title="Marcar pagamento deste jogo como recebido"
            >
              <CircleDollarSign size={15} />
              Marcar pago
            </button>
          </form>
        ) : (
          <div className="min-w-0 flex-1" />
        )}

        {!player.player_id ? (
          <button
            type="button"
            onClick={() => setPromoting(true)}
            aria-label={`Transformar ${player.name} em participante`}
            title="Transformar em participante"
            className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--success)]/30 text-[var(--success)]"
          >
            <UserPlus size={16} />
          </button>
        ) : null}

        <MoveTeamButton player={player} gameId={gameId} />

        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={`Editar ${player.name}`}
          title="Editar jogador"
          className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--border)] text-[var(--brand)]"
        >
          <Pencil size={16} />
        </button>

        {player.payment_status !== "paid" ? (
          <form action={removePublicGameConfirmation}>
            <input type="hidden" name="confirmation_id" value={player.guest_confirmation_id ?? ""} />
            <input type="hidden" name="game_id" value={gameId} />
            <button
              aria-label={`Excluir ${player.name}`}
              title="Excluir jogador"
              className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--danger)]/30 text-[var(--danger)]"
            >
              <Trash2 size={16} />
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}

export function PublicGameInviteCard({
  game,
  confirmations,
  appUrl,
  billingMode,
  eligiblePlayers,
}: {
  game: Game;
  confirmations: GameRosterPlayer[];
  appUrl: string;
  billingMode: BillingMode;
  eligiblePlayers: Participant[];
}) {
  const [copied, setCopied] = useState(false);
  const inviteUrl = `${
    appUrl ||
    (typeof window !== "undefined" ? window.location.origin : "")
  }/confirmar-jogo/${game.public_invite_token}`;

  const guests = confirmations.filter((player) => player.source === "guest");
  const confirmed = confirmations.filter(
    (player) => player.attendance_status === "confirmed"
  );
  const confirmedGuests = guests.filter(
    (player) => player.attendance_status === "confirmed"
  );
  const confirmedParticipants = confirmations.filter(
    (player) =>
      player.source === "participant" &&
      player.attendance_status === "confirmed"
  );
  const expected = confirmed.reduce((total, player) => total + Number(player.amount ?? 0), 0);
  const received = confirmed
    .filter((player) => player.payment_status === "paid")
    .reduce((total, player) => total + Number(player.amount ?? 0), 0);
  const declined = guests.filter(
    (player) => player.attendance_status === "declined"
  );
  const hasDraw = confirmed.some((player) => player.team_number);
  const teamOne = confirmed.filter((player) => player.team_number === 1);
  const teamTwo = confirmed.filter((player) => player.team_number === 2);
  const waiting = confirmed.filter((player) => !player.team_number);

  async function copyInvite() {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section className="mt-10">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[var(--brand)]">
          Partida
        </p>
        <h2 className="mt-2 text-xl font-black">
          Jogadores do jogo
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Uma única lista para presença, pagamento e sorteio. Participantes e convidados entram no mesmo fluxo.
        </p>
      </div>

      <div className="card mt-4 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[.14em] text-[var(--brand)]">
              Link do jogo
            </p>
            <p className="mt-2 break-all text-sm text-[var(--muted)]">
              {inviteUrl}
            </p>
          </div>
          <button
            type="button"
            onClick={copyInvite}
            className="focus-ring inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white/[.04] px-4 text-sm font-bold text-[var(--brand)]"
          >
            <Clipboard size={16} />
            {copied ? "Copiado!" : "Copiar link"}
          </button>
        </div>

        {game.status === "scheduled" ? (
          <div className="mt-4">
            <AddPlayersForm game={game.id} players={eligiblePlayers} />
          </div>
        ) : (
          <p className="mt-4 rounded-xl bg-white/[.04] p-3 text-sm text-[var(--muted)]">
            O jogo está {game.status === "completed" ? "encerrado" : "cancelado"}. A lista abaixo fica somente para consulta e financeiro.
          </p>
        )}

        <div className="mt-5 grid grid-cols-3 gap-2 border-t border-[var(--border)] pt-5 text-center">
          <div className="rounded-xl bg-white/[.03] p-3">
            <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Previsto</p>
            <p className="mt-1 font-black">{expected.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
          </div>
          <div className="rounded-xl bg-white/[.03] p-3">
            <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Recebido</p>
            <p className="mt-1 font-black text-[var(--success)]">{received.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
          </div>
          <div className="rounded-xl bg-white/[.03] p-3">
            <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Em aberto</p>
            <p className="mt-1 font-black text-[var(--warning)]">{(expected - received).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-5">
          <div className="flex items-center gap-2 text-sm">
            <UsersRound size={17} className="text-[var(--brand)]" />
            <strong>{confirmed.length}</strong>
            <span className="text-[var(--muted)]">no sorteio</span>
          </div>

          {game.status === "scheduled" ? (
            <form action={drawPublicGameTeams}>
              <input type="hidden" name="game_id" value={game.id} />
              <button
                disabled={confirmed.length < 2}
                className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-bold text-[#01111d] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Shuffle size={17} />
                {hasDraw ? "Sortear novamente" : "Sortear 2 times"}
              </button>
            </form>
          ) : null}
        </div>
      </div>

      {confirmed.length === 0 && declined.length === 0 ? (
        <div className="card mt-4 p-8 text-center text-sm text-[var(--muted)]">
          Nenhum jogador confirmado ainda.
        </div>
      ) : hasDraw ? (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black">Time 1</h3>
              <span className="text-xs text-[var(--muted)]">
                {teamOne.length} jogador(es)
              </span>
            </div>
            <div className="mt-4 space-y-2">
              {teamOne.map((player) => (
                <PlayerRow key={player.id} player={player} gameId={game.id} billingMode={billingMode} />
              ))}
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black">Time 2</h3>
              <span className="text-xs text-[var(--muted)]">
                {teamTwo.length} jogador(es)
              </span>
            </div>
            <div className="mt-4 space-y-2">
              {teamTwo.map((player) => (
                <PlayerRow key={player.id} player={player} gameId={game.id} billingMode={billingMode} />
              ))}
            </div>
          </div>

          {waiting.length ? (
            <div className="card p-4 md:col-span-2">
              <h3 className="font-black">Ainda sem time</h3>
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {waiting.map((player) => (
                  <PlayerRow
                    key={player.id}
                    player={player}
                    gameId={game.id}
                    billingMode={billingMode}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {declined.length ? (
            <div className="card p-4 md:col-span-2">
              <h3 className="font-black">Não vão</h3>
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {declined.map((player) => (
                  <PlayerRow
                    key={player.id}
                    player={player}
                    gameId={game.id}
                    billingMode={billingMode}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="card p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-black">Participantes</h3>
              <span className="text-xs text-[var(--muted)]">{confirmedParticipants.length} confirmado(s)</span>
            </div>
            <div className="mt-4 grid gap-2">
              {confirmedParticipants.length ? confirmedParticipants.map((player) => (
                <PlayerRow key={player.id} player={player} gameId={game.id} billingMode={billingMode} />
              )) : <p className="rounded-xl bg-white/[.03] p-4 text-sm text-[var(--muted)]">Nenhum participante confirmou ainda.</p>}
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-black">Convidados</h3>
              <span className="text-xs text-[var(--muted)]">{confirmedGuests.length} confirmado(s)</span>
            </div>
            <div className="mt-4 grid gap-2">
              {confirmedGuests.length ? confirmedGuests.map((player) => (
                <PlayerRow key={player.id} player={player} gameId={game.id} billingMode={billingMode} />
              )) : <p className="rounded-xl bg-white/[.03] p-4 text-sm text-[var(--muted)]">Nenhum convidado confirmado.</p>}
            </div>
          </div>

          {declined.length ? (
            <div className="card lg:col-span-2 p-4">
              <h3 className="font-black">Não vão</h3>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {declined.map((player) => (
                  <PlayerRow
                    key={player.id}
                    player={player}
                    gameId={game.id}
                    billingMode={billingMode}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
