"use client";

import { CalendarDays, Pencil, Phone, WalletCards } from "lucide-react";
import { useCallback, useState } from "react";
import { ParticipantForm } from "@/components/futgestor/participant-form";
import { formatCurrency, formatDate, initials } from "@/lib/formatters";
import type { Organization, Participant } from "@/types/participants";

export function ParticipantProfile({ organization, participant }: { organization: Organization; participant: Participant }) {
  const [editing, setEditing] = useState(false);
  const close = useCallback(() => setEditing(false), []);
  return <>
    <section className="card mt-7 p-5 sm:p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <span className="grid size-16 shrink-0 place-items-center rounded-full bg-white/10 text-xl font-bold">{initials(participant.name)}</span>
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-3"><h1 className="truncate text-2xl font-bold sm:text-3xl">{participant.name}</h1><span className={`rounded-full px-3 py-1 text-xs font-bold ${participant.status === "active" ? "bg-[var(--brand)]/15 text-[var(--brand)]" : "bg-white/10 text-[var(--muted)]"}`}>{participant.status === "active" ? "Ativo" : "Inativo"}</span></div>{participant.phone && <p className="mt-2 flex items-center gap-2 text-sm text-[var(--muted)]"><Phone size={16}/>{participant.phone}</p>}</div>
        <button onClick={() => setEditing(true)} className="focus-ring flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white/5 px-4 font-semibold"><Pencil size={17}/>Editar participante</button>
      </div>
      <div className="mt-7 grid gap-4 border-t border-[var(--border)] pt-6 sm:grid-cols-3">
        <div className="flex gap-3"><WalletCards size={19} className="text-[var(--brand)]"/><div><p className="text-xs text-[var(--muted)]">Mensalidade</p><p className="mt-1 font-semibold">{formatCurrency(participant.monthly_fee)}</p></div></div>
        <div className="flex gap-3"><CalendarDays size={19} className="text-[var(--brand)]"/><div><p className="text-xs text-[var(--muted)]">Vencimento</p><p className="mt-1 font-semibold">Dia {participant.due_day}</p></div></div>
        <div><p className="text-xs text-[var(--muted)]">Data de entrada</p><p className="mt-1 font-semibold">{formatDate(participant.joined_at)}</p></div>
      </div>
      {participant.notes && <div className="mt-6 border-t border-[var(--border)] pt-5"><p className="text-xs text-[var(--muted)]">Observações</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{participant.notes}</p></div>}
    </section>
    <ParticipantForm open={editing} onClose={close} organization={organization} participant={participant}/>
  </>;
}
