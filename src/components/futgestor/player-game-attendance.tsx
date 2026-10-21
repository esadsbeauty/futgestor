"use client";

import { CheckCircle2, Clock3, UsersRound, XCircle } from "lucide-react";
import { useActionState, useState } from "react";
import { respondMyGameAttendance, type PlayerAccountActionState } from "@/lib/mutations/player-account";
import type { PlayerAccountGame, PlayerConfirmedRosterEntry } from "@/types/player-account";
import type { GuestPosition } from "@/types/games";

const initialState: PlayerAccountActionState = { ok: false };

const futsalPositions: Array<[GuestPosition, string]> = [
  ["goalkeeper", "Goleiro"],
  ["fixed", "Fixo"],
  ["winger", "Ala"],
  ["pivot", "Pivô"],
  ["other", "Outra"],
];

const footballPositions: Array<[GuestPosition, string]> = [
  ["goalkeeper", "Goleiro"],
  ["full_back", "Lateral"],
  ["center_back", "Zagueiro"],
  ["defensive_mid", "Volante"],
  ["midfielder", "Meio-campo"],
  ["winger", "Ponta"],
  ["striker", "Atacante"],
  ["other", "Outra"],
];

const positionLabels = Object.fromEntries(
  [...futsalPositions, ...footballPositions]
) as Record<GuestPosition, string>;

export function PlayerGameAttendance({
  game,
  roster,
}: {
  game: PlayerAccountGame;
  roster: PlayerConfirmedRosterEntry[];
}) {
  const [state, action, pending] = useActionState(respondMyGameAttendance, initialState);
  const [positionOpen, setPositionOpen] = useState(false);
  const status = state.ok && state.status ? state.status : game.attendance_status;
  const positions = game.game_format === "field" ? footballPositions : futsalPositions;

  if (game.attendance_locked) {
    return (
      <div className="mt-5 border-t border-[var(--border)] pt-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-[var(--muted)]">Sua presença</p>
            <p className="mt-1 text-sm font-bold text-[var(--muted)]">Jogo encerrado para confirmações</p>
          </div>
          <Clock3 className="text-[var(--muted)]" size={22} />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 border-t border-[var(--border)] pt-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-[var(--muted)]">Sua presença</p>
          <p className={
            status === "confirmed"
              ? "mt-1 text-sm font-bold text-[var(--success)]"
              : status === "declined"
                ? "mt-1 text-sm font-bold text-[var(--danger)]"
                : "mt-1 text-sm font-bold text-[var(--warning)]"
          }>
            {status === "confirmed" ? "Presença confirmada" : status === "declined" ? "Não vou" : "Pendente"}
          </p>
        </div>
        {status === "confirmed" ? <CheckCircle2 className="text-[var(--success)]" size={22} /> : status === "declined" ? <XCircle className="text-[var(--danger)]" size={22} /> : null}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setPositionOpen(true)}
          className="focus-ring min-h-11 w-full rounded-xl bg-[var(--success)] px-4 text-sm font-bold text-[#02150d]"
        >
          Vou jogar
        </button>
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

      <div className="mt-5 rounded-2xl border border-[var(--border)] bg-white/[.025] p-4">
        <div className="flex items-center gap-2">
          <UsersRound size={17} className="text-[var(--brand)]" />
          <p className="text-sm font-bold">
            {roster.some((entry) => entry.team_number) ? "Times sorteados" : "Confirmados neste jogo"}
          </p>
        </div>

        {roster.some((entry) => entry.team_number) ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[1, 2].map((team) => {
              const players = roster.filter((entry) => entry.team_number === team);
              return (
                <div key={team} className="rounded-xl border border-[var(--border)] bg-white/[.025] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-black">Time {team}</p>
                    <span className="text-[11px] text-[var(--muted)]">{players.length} jogador(es)</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {players.map((entry, index) => (
                      <div key={`${entry.game_id}-${team}-${entry.player_name}-${index}`} className="flex items-center justify-between gap-3 rounded-lg bg-white/[.03] px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{entry.player_name}</p>
                          <p className="mt-0.5 text-[11px] text-[var(--muted)]">{entry.source === "guest" ? "Convidado" : "Participante"}</p>
                        </div>
                        {entry.position ? <span className="shrink-0 text-xs font-bold text-[var(--brand)]">{positionLabels[entry.position]}</span> : null}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : roster.length ? (
          <div className="mt-3 space-y-2">
            {roster.map((entry, index) => (
              <div key={`${entry.game_id}-${entry.source}-${entry.player_name}-${index}`} className="flex items-center justify-between gap-3 rounded-xl bg-white/[.03] px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{entry.player_name}</p>
                  <p className="mt-0.5 text-[11px] text-[var(--muted)]">{entry.source === "guest" ? "Convidado" : "Participante"}</p>
                </div>
                {entry.position ? <span className="shrink-0 text-xs font-bold text-[var(--brand)]">{positionLabels[entry.position]}</span> : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--muted)]">Ninguém confirmou ainda.</p>
        )}
      </div>

      {state.message && !state.ok ? <p className="mt-3 text-sm text-[var(--danger)]">{state.message}</p> : null}

      {positionOpen ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={(event) => event.target === event.currentTarget && setPositionOpen(false)}>
          <div className="w-full rounded-t-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-5 sm:max-w-md sm:rounded-[1.75rem]">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--brand)]">Confirmar presença</p>
            <h3 className="mt-2 text-xl font-black">Qual posição você vai jogar?</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">Sua posição salva já vem selecionada. Confirme ou altere antes de entrar no jogo.</p>
            <form action={action} className="mt-5">
              <input type="hidden" name="game_id" value={game.game_id} />
              <input type="hidden" name="status" value="confirmed" />
              <select name="position" className="input" defaultValue={game.attendance_position ?? game.default_position ?? ""} required>
                <option value="" disabled>Selecione sua posição</option>
                {positions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setPositionOpen(false)} className="focus-ring min-h-11 rounded-xl border border-[var(--border)] font-bold">Cancelar</button>
                <button disabled={pending} className="focus-ring min-h-11 rounded-xl bg-[var(--success)] font-bold text-[#02150d] disabled:opacity-50">
                  {pending ? "Confirmando..." : "Confirmar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
