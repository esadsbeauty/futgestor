"use client";

import { CheckCircle2 } from "lucide-react";
import { useActionState } from "react";
import {
  confirmPublicGamePresence,
  type GameActionState,
} from "@/lib/mutations/games";
import type { GameFormat } from "@/types/games";

const initialState: GameActionState = { ok: false };

const courtPositions = [
  ["goalkeeper", "Goleiro"],
  ["fixed", "Fixo"],
  ["winger", "Ala"],
  ["pivot", "Pivô"],
  ["other", "Outra"],
] as const;

const fieldPositions = [
  ["goalkeeper", "Goleiro"],
  ["full_back", "Lateral"],
  ["center_back", "Zagueiro"],
  ["defensive_mid", "Volante"],
  ["midfielder", "Meio-campo"],
  ["winger", "Ponta"],
  ["striker", "Atacante"],
  ["other", "Outra"],
] as const;

export function PublicGameConfirmationForm({
  token,
  gameFormat,
}: {
  token: string;
  gameFormat: GameFormat;
}) {
  const [state, action, pending] = useActionState(
    confirmPublicGamePresence,
    initialState
  );

  if (state.ok) {
    return (
      <div className="text-center">
        <CheckCircle2 className="mx-auto size-14 text-[var(--success)]" />
        <h2 className="mt-4 text-2xl font-black">Presença confirmada!</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Seu nome entrou na lista deste jogo.
        </p>
      </div>
    );
  }

  const positions = gameFormat === "court" ? courtPositions : fieldPositions;

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="token" value={token} />

      <label className="block">
        <span className="text-sm font-medium">Seu nome</span>
        <input
          name="name"
          required
          minLength={2}
          autoComplete="name"
          className="input"
          placeholder="Digite seu nome"
        />
        {state.fieldErrors?.name?.[0] ? (
          <small className="mt-1 block text-[var(--danger)]">
            {state.fieldErrors.name[0]}
          </small>
        ) : null}
      </label>

      <label className="block">
        <span className="text-sm font-medium">Sua posição</span>
        <select name="position" className="input" required defaultValue="">
          <option value="" disabled>Selecione</option>
          {positions.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        {state.fieldErrors?.position?.[0] ? (
          <small className="mt-1 block text-[var(--danger)]">
            {state.fieldErrors.position[0]}
          </small>
        ) : null}
      </label>

      {state.message ? (
        <p role="alert" className="text-sm text-[var(--danger)]">{state.message}</p>
      ) : null}

      <button
        disabled={pending}
        className="focus-ring min-h-12 w-full rounded-xl bg-[var(--brand)] px-5 font-bold text-[#01111d] disabled:opacity-60"
      >
        {pending ? "Confirmando..." : "Confirmar presença"}
      </button>
    </form>
  );
}
