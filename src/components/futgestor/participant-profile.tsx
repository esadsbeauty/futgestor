"use client";

import { CalendarDays, Pencil, Phone, WalletCards } from "lucide-react";
import { useActionState, useCallback, useState } from "react";
import { saveTechnicalLevel } from "@/lib/mutations/technical-level";
import { ParticipantForm } from "@/components/futgestor/participant-form";
import { formatCurrency, formatDate, initials } from "@/lib/formatters";
import type { Organization, Participant } from "@/types/participants";

function TechnicalLevelForm({ playerId, level }: { playerId: string; level: number }) {
  const [state, action, pending] = useActionState(saveTechnicalLevel, { ok: false, message: "" });
  return <form action={action} className="mt-5 flex flex-wrap items-end gap-3 border-t border-[var(--border)] pt-5">
    <input type="hidden" name="player_id" value={playerId} />
    <label className="flex-1 min-w-40"><span className="text-xs text-[var(--muted)]">Nível técnico (1 a 5)</span>
      <select name="technical_level" defaultValue={level} className="input mt-1">
        <option value="1">1 — Iniciante</option><option value="2">2 — Básico</option>
        <option value="3">3 — Intermediário</option><option value="4">4 — Avançado</option>
        <option value="5">5 — Destaque</option>
      </select>
    </label>
    <button disabled={pending} className="min-h-11 rounded-xl bg-[var(--brand)] px-4 font-bold text-[#01111d] disabled:opacity-50">{pending ? "Salvando..." : "Salvar nível"}</button>
    {state.message ? <p className={`w-full text-xs ${state.ok ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>{state.message}</p> : null}
  </form>;
}

export function ParticipantProfile({ organization, participant }: { organization: Organization; participant: Participant }) {
  const [editing, setEditing] = useState(false);
  const close = useCallback(() => setEditing(false), []);
  return <>
    <section className="card mt-7 p-5 sm:p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <span className="grid size-16 shrink-0 place-items-center rounded-2xl border border-[var(--brand)]/20 bg-[var(--brand)]/10 text-xl font-black text-[var(--brand)] shadow-[var(--glow)]">{initials(participant.name)}</span>
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-3"><h1 className="truncate text-2xl font-black tracking-[-.035em] sm:text-3xl">{participant.name}</h1><span className={`rounded-full border px-3 py-1 text-xs font-bold ${participant.status === "active" ? "border-[var(--success)]/20 bg-[var(--success)]/10 text-[var(--success)]" : "border-white/5 bg-white/[.06] text-[var(--muted)]"}`}>{participant.status === "active" ? "Ativo" : "Inativo"}</span></div>{participant.phone && <p className="mt-2 flex items-center gap-2 text-sm text-[var(--muted)]"><Phone size={16}/>{participant.phone}</p>}</div>
        <button onClick={() => setEditing(true)} className="focus-ring flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white/5 px-4 font-semibold"><Pencil size={17}/>Editar participante</button>
      </div>
      <div className="mt-7 grid gap-4 border-t border-[var(--border)] pt-6 sm:grid-cols-3">
        <div className="flex gap-3"><WalletCards size={19} className="text-[var(--brand)]"/><div><p className="text-xs text-[var(--muted)]">Mensalidade</p><p className="mt-1 font-semibold">{formatCurrency(participant.monthly_fee)}</p></div></div>
        <div className="flex gap-3"><CalendarDays size={19} className="text-[var(--brand)]"/><div><p className="text-xs text-[var(--muted)]">Vencimento</p><p className="mt-1 font-semibold">Dia {participant.due_day}</p></div></div>
        <div><p className="text-xs text-[var(--muted)]">Data de entrada</p><p className="mt-1 font-semibold">{formatDate(participant.joined_at)}</p></div>
      </div>
      <div className="mt-5 grid gap-3 border-t border-[var(--border)] pt-5 sm:grid-cols-2">
        <div><p className="text-xs text-[var(--muted)]">Posição no futsal</p><p className="mt-1 font-semibold">{participant.default_futsal_position ? ({
          goalkeeper: "Goleiro", fixed: "Fixo", winger: "Ala", pivot: "Pivô", other: "Outra"
        } as Record<string,string>)[participant.default_futsal_position] : "Não definida"}</p></div>
        <div><p className="text-xs text-[var(--muted)]">Posição no campo</p><p className="mt-1 font-semibold">{participant.default_field_position ? ({
          goalkeeper: "Goleiro", full_back: "Lateral", center_back: "Zagueiro", defensive_mid: "Volante", midfielder: "Meio-campo", winger: "Ponta", striker: "Atacante", other: "Outra"
        } as Record<string,string>)[participant.default_field_position] : "Não definida"}</p></div>
      </div>
      <TechnicalLevelForm playerId={participant.id} level={Number((participant as Participant & { technical_level?: number }).technical_level ?? 3)} />
      {participant.notes && <div className="mt-6 border-t border-[var(--border)] pt-5"><p className="text-xs text-[var(--muted)]">Observações</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{participant.notes}</p></div>}
    </section>
    <ParticipantForm open={editing} onClose={close} organization={organization} participant={participant}/>
  </>;
}
