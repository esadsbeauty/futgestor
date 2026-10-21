"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { useActionState, useState } from "react";
import {
  confirmPublicGamePresence,
  type GameActionState,
} from "@/lib/mutations/games";
import type { GameFormat, GuestAttendanceStatus } from "@/types/games";

const initialState: GameActionState = { ok: false };

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

export function PublicGameConfirmationForm({
  token,
  gameFormat,
}: {
  token: string;
  gameFormat: GameFormat;
}) {
  const [state, action, pending] = useActionState(confirmPublicGamePresence, initialState);
  const [attendanceStatus, setAttendanceStatus] = useState<GuestAttendanceStatus | "">("");
  const positions = gameFormat === "field" ? footballPositions : futsalPositions;

  if (state.ok) {
    const going = state.message?.includes("confirmada");
    return (
      <div className="text-center">
        {going ? (
          <CheckCircle2 className="mx-auto size-14 text-[var(--success)]" />
        ) : (
          <XCircle className="mx-auto size-14 text-[var(--muted)]" />
        )}
        <h2 className="mt-4 text-2xl font-black">
          {going ? "Presença confirmada!" : "Resposta registrada"}
        </h2>
        <p className="mt-2 text-sm text-[var(--muted)]">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="sport_type" value={gameFormat === "field" ? "football" : "futsal"} />

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
          <small className="mt-1 block text-[var(--danger)]">{state.fieldErrors.name[0]}</small>
        ) : null}
      </label>

      <div>
        <span className="text-sm font-medium">Você vai participar?</span>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <label className={`cursor-pointer rounded-2xl border p-4 text-center transition ${attendanceStatus === "confirmed" ? "border-[var(--success)]/50 bg-[var(--success)]/10" : "border-[var(--border)] bg-white/[.025]"}`}>
            <input type="radio" name="attendance_status" value="confirmed" className="sr-only" required onChange={() => setAttendanceStatus("confirmed")} />
            <CheckCircle2 className="mx-auto text-[var(--success)]" size={22}/>
            <span className="mt-2 block text-sm font-bold">Vou</span>
          </label>

          <label className={`cursor-pointer rounded-2xl border p-4 text-center transition ${attendanceStatus === "declined" ? "border-[var(--danger)]/40 bg-[var(--danger)]/10" : "border-[var(--border)] bg-white/[.025]"}`}>
            <input type="radio" name="attendance_status" value="declined" className="sr-only" required onChange={() => setAttendanceStatus("declined")} />
            <XCircle className="mx-auto text-[var(--danger)]" size={22}/>
            <span className="mt-2 block text-sm font-bold">Não vou</span>
          </label>
        </div>
      </div>

      {attendanceStatus === "confirmed" ? (
        <label className="block">
          <span className="text-sm font-medium">Sua posição</span>
          <select name="position" className="input" required defaultValue="">
            <option value="" disabled>Selecione</option>
            {positions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          {state.fieldErrors?.position?.[0] ? (
            <small className="mt-1 block text-[var(--danger)]">{state.fieldErrors.position[0]}</small>
          ) : null}
        </label>
      ) : null}

      {state.message ? <p role="alert" className="text-sm text-[var(--danger)]">{state.message}</p> : null}

      <button
        disabled={pending || !attendanceStatus}
        className="focus-ring min-h-12 w-full rounded-xl bg-[var(--brand)] px-5 font-bold text-[#01111d] disabled:opacity-60"
      >
        {pending ? "Salvando resposta..." : "Confirmar resposta"}
      </button>
    </form>
  );
}
