"use client";

import { useActionState } from "react";
import { updateMyPlayerPosition, type PlayerAccountActionState } from "@/lib/mutations/player-account";
import type { GuestPosition } from "@/types/games";

const initialState: PlayerAccountActionState = { ok: false };

export function PlayerPositionForm({
  futsalPosition,
  fieldPosition,
}: {
  futsalPosition: GuestPosition | null;
  fieldPosition: GuestPosition | null;
}) {
  const [state, action, pending] = useActionState(updateMyPlayerPosition, initialState);

  return (
    <form action={action} className="mt-5 space-y-4">
      <label className="block">
        <span className="text-xs text-[var(--muted)]">Posição no futsal</span>
        <select name="futsal_position" className="input mt-2" defaultValue={futsalPosition ?? ""}>
          <option value="">Não definida</option>
          <option value="goalkeeper">Goleiro</option>
          <option value="fixed">Fixo</option>
          <option value="winger">Ala</option>
          <option value="pivot">Pivô</option>
          <option value="other">Outra</option>
        </select>
      </label>

      <label className="block">
        <span className="text-xs text-[var(--muted)]">Posição no campo</span>
        <select name="field_position" className="input mt-2" defaultValue={fieldPosition ?? ""}>
          <option value="">Não definida</option>
          <option value="goalkeeper">Goleiro</option>
          <option value="full_back">Lateral</option>
          <option value="center_back">Zagueiro</option>
          <option value="defensive_mid">Volante</option>
          <option value="midfielder">Meio-campo</option>
          <option value="winger">Ponta</option>
          <option value="striker">Atacante</option>
          <option value="other">Outra</option>
        </select>
      </label>

      {state.message ? (
        <p className={`text-sm ${state.ok ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
          {state.message}
        </p>
      ) : null}

      <button disabled={pending} className="focus-ring min-h-11 rounded-xl bg-[var(--brand)] px-5 font-bold text-[#07110d] disabled:opacity-50">
        {pending ? "Salvando..." : "Salvar posições"}
      </button>
    </form>
  );
}
