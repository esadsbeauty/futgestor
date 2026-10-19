"use client";

import { useState } from "react";
import { respondOwnGameAttendance } from "@/lib/mutations/games";
import type { GameAttendancePlayer, GameFormat, GuestPosition } from "@/types/games";

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

export function OwnGameAttendanceCard({
  gameId,
  gameFormat,
  player,
}: {
  gameId: string;
  gameFormat: GameFormat;
  player: GameAttendancePlayer;
}) {
  const [choosing, setChoosing] = useState(false);
  const defaultPosition = player.position ?? player.default_position ?? "";
  const positions = gameFormat === "field" ? footballPositions : futsalPositions;

  return (
    <div className="card mt-4 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--brand)]">
            Sua confirmação
          </p>
          <p className="mt-1 font-bold">{player.player_name}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Status atual: {player.status === "confirmed" ? "Confirmado" : player.status === "declined" ? "Não vai" : "Pendente"}
            {player.position ? ` · ${positionLabels[player.position]}` : ""}
          </p>
        </div>

        {!choosing ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setChoosing(true)}
              className={`rounded-xl px-4 py-2.5 text-sm font-bold ${
                player.status === "confirmed"
                  ? "bg-[var(--success)] text-[#02150d]"
                  : "border border-[var(--success)]/30 bg-[var(--success)]/10 text-[var(--success)]"
              }`}
            >
              Vou jogar
            </button>

            <form action={respondOwnGameAttendance}>
              <input type="hidden" name="game_id" value={gameId} />
              <input type="hidden" name="status" value="declined" />
              <button
                className={`rounded-xl px-4 py-2.5 text-sm font-bold ${
                  player.status === "declined"
                    ? "bg-[var(--danger)] text-white"
                    : "border border-[var(--danger)]/30 bg-[var(--danger)]/10 text-[var(--danger)]"
                }`}
              >
                Não vou
              </button>
            </form>
          </div>
        ) : null}
      </div>

      {choosing ? (
        <form action={respondOwnGameAttendance} className="mt-4 rounded-2xl border border-[var(--border)] bg-white/[.025] p-4">
          <input type="hidden" name="game_id" value={gameId} />
          <input type="hidden" name="status" value="confirmed" />

          <label>
            <span className="text-xs font-bold text-[var(--muted)]">Sua posição neste jogo</span>
            <select
              name="position"
              className="input mt-2"
              defaultValue={defaultPosition}
              required
            >
              <option value="" disabled>Selecione sua posição</option>
              {positions.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
            A posição escolhida ficará salva no seu perfil e será sugerida nos próximos jogos.
          </p>

          <div className="mt-4 flex gap-2">
            <button className="rounded-xl bg-[var(--success)] px-4 py-2.5 text-sm font-bold text-[#02150d]">
              Confirmar presença
            </button>
            <button
              type="button"
              onClick={() => setChoosing(false)}
              className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-bold"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
