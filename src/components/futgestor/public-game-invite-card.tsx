"use client";

import { Clipboard, Shuffle, UsersRound } from "lucide-react";
import { useState } from "react";
import { drawPublicGameTeams } from "@/lib/mutations/games";
import type { Game, GameGuestConfirmation, GuestPosition } from "@/types/games";

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

export function PublicGameInviteCard({
  game,
  confirmations,
  appUrl,
}: {
  game: Game;
  confirmations: GameGuestConfirmation[];
  appUrl: string;
}) {
  const [copied, setCopied] = useState(false);
  const inviteUrl = `${appUrl || (typeof window !== "undefined" ? window.location.origin : "")}/confirmar-jogo/${game.public_invite_token}`;
  const hasDraw = confirmations.some((player) => player.team_number);
  const teamOne = confirmations.filter((player) => player.team_number === 1);
  const teamTwo = confirmations.filter((player) => player.team_number === 2);
  const waiting = confirmations.filter((player) => !player.team_number);

  async function copyInvite() {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function PlayerRow({ player }: { player: GameGuestConfirmation }) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-white/[.025] px-3 py-2.5">
        <span className="min-w-0 truncate text-sm font-bold">{player.name}</span>
        <span className="shrink-0 text-xs text-[var(--muted)]">{positionLabels[player.position]}</span>
      </div>
    );
  }

  return (
    <section className="mt-10">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[var(--brand)]">Convite público</p>
        <h2 className="mt-2 text-xl font-black">Confirmação e sorteio dos times</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Envie o link no grupo. A pessoa confirma nome e posição sem precisar criar conta.
        </p>
      </div>

      <div className="card mt-4 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[.14em] text-[var(--brand)]">
              Link do jogo
            </p>
            <p className="mt-2 break-all text-sm text-[var(--muted)]">{inviteUrl}</p>
          </div>
          <button
            type="button"
            onClick={copyInvite}
            className="focus-ring inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white/[.04] px-4 text-sm font-bold text-[var(--brand)]"
          >
            <Clipboard size={16}/>
            {copied ? "Copiado!" : "Copiar link"}
          </button>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-5">
          <div className="flex items-center gap-2 text-sm">
            <UsersRound size={17} className="text-[var(--brand)]"/>
            <strong>{confirmations.length}</strong>
            <span className="text-[var(--muted)]">confirmado(s)</span>
          </div>

          <form action={drawPublicGameTeams}>
            <input type="hidden" name="game_id" value={game.id}/>
            <button
              disabled={confirmations.length < 2}
              className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-bold text-[#01111d] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Shuffle size={17}/>
              {hasDraw ? "Sortear novamente" : "Sortear 2 times"}
            </button>
          </form>
        </div>
      </div>

      {confirmations.length === 0 ? (
        <div className="card mt-4 p-8 text-center text-sm text-[var(--muted)]">
          Ninguém confirmou presença por este link ainda.
        </div>
      ) : hasDraw ? (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black">Time 1</h3>
              <span className="text-xs text-[var(--muted)]">{teamOne.length} jogador(es)</span>
            </div>
            <div className="mt-4 space-y-2">
              {teamOne.map((player) => <PlayerRow key={player.id} player={player}/>)}
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black">Time 2</h3>
              <span className="text-xs text-[var(--muted)]">{teamTwo.length} jogador(es)</span>
            </div>
            <div className="mt-4 space-y-2">
              {teamTwo.map((player) => <PlayerRow key={player.id} player={player}/>)}
            </div>
          </div>
          {waiting.length ? (
            <div className="card p-4 md:col-span-2">
              <h3 className="font-black">Ainda sem time</h3>
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {waiting.map((player) => <PlayerRow key={player.id} player={player}/>)}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="card mt-4 p-4">
          <h3 className="font-black">Confirmados</h3>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {confirmations.map((player) => <PlayerRow key={player.id} player={player}/>)}
          </div>
        </div>
      )}
    </section>
  );
}
