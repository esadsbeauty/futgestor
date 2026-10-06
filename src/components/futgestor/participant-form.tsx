"use client";

import { X } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { createParticipant, updateParticipant, type ParticipantActionState } from "@/lib/mutations/participants";
import type { Organization, Participant } from "@/types/participants";
import { ActionToast } from "@/components/ui/action-toast";

const initialState: ParticipantActionState = { ok: false };

function FieldError({ errors }: { errors?: string[] }) {
  return errors?.[0] ? <span className="mt-1 block text-xs text-[var(--danger)]">{errors[0]}</span> : null;
}

export function ParticipantForm({ open, onClose, organization, participant }: { open: boolean; onClose: () => void; organization: Organization; participant?: Participant }) {
  const action = participant ? updateParticipant : createParticipant;
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!state.ok) return;
    if (!participant) formRef.current?.reset();
    onClose();
  }, [state.ok, participant, onClose]);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const today = new Date().toISOString().slice(0, 10);
  return <>
    <ActionToast message={state.message} success={state.ok} />
    {open && <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="participant-form-title" className="max-h-[94vh] w-full overflow-y-auto rounded-t-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl sm:max-w-2xl sm:rounded-[1.75rem] sm:p-7">
        <header className="flex items-center justify-between gap-4"><div><p className="text-sm font-semibold text-[var(--brand)]">Participante</p><h2 id="participant-form-title" className="mt-1 text-2xl font-bold">{participant ? "Editar participante" : "Adicionar participante"}</h2></div><button type="button" onClick={onClose} aria-label="Fechar" className="focus-ring rounded-xl bg-white/5 p-3 text-[var(--muted)]"><X size={20}/></button></header>
        <form ref={formRef} action={formAction} className="mt-7 grid gap-5 sm:grid-cols-2">
          {participant && <input type="hidden" name="participant_id" value={participant.id}/>}
          <label className="sm:col-span-2"><span className="text-sm font-medium">Nome</span><input autoFocus required name="name" defaultValue={participant?.name} placeholder="João Silva" className="input"/><FieldError errors={state.fieldErrors?.name}/></label>
          <label><span className="text-sm font-medium">WhatsApp</span><input name="phone" inputMode="tel" defaultValue={participant?.phone ?? ""} placeholder="(71) 99999-9999" className="input"/><FieldError errors={state.fieldErrors?.phone}/></label>
          <label><span className="text-sm font-medium">Mensalidade</span><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[var(--muted)]">R$</span><input required name="monthly_fee" type="number" inputMode="decimal" min="0.01" step="0.01" defaultValue={participant?.monthly_fee ?? organization.default_monthly_fee} className="input pl-12"/></div><FieldError errors={state.fieldErrors?.monthly_fee}/></label>
          <label><span className="text-sm font-medium">Dia do vencimento</span><input required name="due_day" type="number" inputMode="numeric" min="1" max="31" defaultValue={participant?.due_day ?? organization.default_due_day} className="input"/><FieldError errors={state.fieldErrors?.due_day}/></label>
          <label><span className="text-sm font-medium">Data de entrada</span><input required name="joined_at" type="date" defaultValue={participant?.joined_at ?? today} className="input"/><FieldError errors={state.fieldErrors?.joined_at}/></label>
          <label className="sm:col-span-2"><span className="text-sm font-medium">Status</span><select name="status" defaultValue={participant?.status ?? "active"} className="input"><option value="active">Ativo</option><option value="inactive">Inativo</option></select><FieldError errors={state.fieldErrors?.status}/></label>
          <label className="sm:col-span-2"><span className="text-sm font-medium">Observações</span><textarea name="notes" rows={3} defaultValue={participant?.notes ?? ""} placeholder="Informações opcionais" className="input resize-none"/><FieldError errors={state.fieldErrors?.notes}/></label>
          {state.message && !state.ok && <p role="alert" className="sm:col-span-2 text-sm text-[var(--danger)]">{state.message}</p>}
          <div className="sticky bottom-0 -mx-1 flex gap-3 bg-[var(--surface)] px-1 pt-2 sm:col-span-2"><button type="button" onClick={onClose} className="focus-ring flex-1 rounded-xl border border-[var(--border)] px-4 py-3 font-semibold">Cancelar</button><button disabled={pending} className="focus-ring flex-1 rounded-xl bg-[var(--brand)] px-4 py-3 font-bold text-[#07110d] disabled:opacity-60">{pending ? "Salvando..." : "Salvar"}</button></div>
        </form>
      </section>
    </div>}
  </>;
}
