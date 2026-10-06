"use client";

import { useActionState } from "react";
import { markFinanceBillPaid, markFinanceFeePaid, type FinanceActionState } from "@/lib/mutations/finance";
import { ActionToast } from "@/components/ui/action-toast";

const initialState: FinanceActionState = { ok: false };
export function FinanceActionButton({ kind, id }: { kind: "fee" | "bill"; id: string }) {
  const action = kind === "fee" ? markFinanceFeePaid : markFinanceBillPaid;
  const [state, formAction, pending] = useActionState(action, initialState);
  return <><form action={formAction}><input type="hidden" name={kind === "fee" ? "fee_id" : "bill_id"} value={id}/><button disabled={pending || state.ok} className="focus-ring min-h-10 rounded-xl bg-[var(--brand)] px-3 text-xs font-bold text-[#07110d] disabled:opacity-60">{pending ? "Processando..." : state.ok ? "Pago" : kind === "fee" ? "Marcar como pago" : "Marcar como paga"}</button></form><ActionToast message={state.message} success={state.ok}/></>;
}
