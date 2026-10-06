"use client";

import { Plus, X } from "lucide-react";
import { useActionState, useState } from "react";
import { createBill, type FinanceActionState } from "@/lib/mutations/finance";
import { ActionToast } from "@/components/ui/action-toast";

const initialState: FinanceActionState = { ok: false };
const ErrorText = ({ errors }: { errors?: string[] }) => errors?.[0] ? <span className="mt-1 block text-xs text-[var(--danger)]">{errors[0]}</span> : null;

export function BillForm({ defaultDate }: { defaultDate: string }) {
  const [open, setOpen] = useState(false);
  const submit = async (previous: FinanceActionState, formData: FormData) => {
    const next = await createBill(previous, formData);
    if (next.ok) setOpen(false);
    return next;
  };
  const [state, action, pending] = useActionState(submit, initialState);
  return <><button onClick={() => setOpen(true)} className="focus-ring flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-[var(--border)] bg-white/5 px-3 text-sm font-semibold sm:px-4"><Plus size={18}/><span className="hidden sm:inline">Nova conta</span></button><ActionToast message={state.message} success={state.ok}/>
    {open && <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}><section role="dialog" aria-modal="true" aria-labelledby="bill-title" className="w-full rounded-t-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl sm:max-w-lg sm:rounded-[1.75rem] sm:p-7"><header className="flex items-center justify-between"><div><p className="text-sm font-semibold text-[var(--brand)]">Contas a pagar</p><h2 id="bill-title" className="mt-1 text-2xl font-bold">Nova conta</h2></div><button type="button" aria-label="Fechar" onClick={() => setOpen(false)} className="focus-ring rounded-xl bg-white/5 p-3 text-[var(--muted)]"><X size={20}/></button></header><form action={action} className="mt-7 space-y-5"><label className="block"><span className="text-sm font-medium">Descrição</span><input autoFocus name="description" required placeholder="Ex.: Aluguel do campo" className="input"/><ErrorText errors={state.fieldErrors?.description}/></label><label className="block"><span className="text-sm font-medium">Valor</span><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[var(--muted)]">R$</span><input name="amount" required type="number" min="0.01" step="0.01" inputMode="decimal" className="input pl-12"/></div><ErrorText errors={state.fieldErrors?.amount}/></label><label className="block"><span className="text-sm font-medium">Vencimento</span><input name="due_date" required type="date" defaultValue={defaultDate} className="input"/><ErrorText errors={state.fieldErrors?.due_date}/></label>{state.message && !state.ok && <p role="alert" className="text-sm text-[var(--danger)]">{state.message}</p>}<div className="flex gap-3 pt-2"><button type="button" onClick={() => setOpen(false)} className="focus-ring flex-1 rounded-xl border border-[var(--border)] px-4 py-3 font-semibold">Cancelar</button><button disabled={pending} className="focus-ring flex-1 rounded-xl bg-[var(--brand)] px-4 py-3 font-bold text-[#07110d] disabled:opacity-60">{pending ? "Salvando..." : "Salvar conta"}</button></div></form></section></div>}
  </>;
}
