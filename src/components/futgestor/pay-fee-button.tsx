"use client";

import { useActionState } from "react";
import { markParticipantFeePaid, type ParticipantActionState } from "@/lib/mutations/participants";
import { ActionToast } from "@/components/ui/action-toast";

const initialState: ParticipantActionState = { ok: false };
export function PayFeeButton({ feeId, participantId, compact = false }: { feeId: string; participantId: string; compact?: boolean }) {
  const [state, action, pending] = useActionState(markParticipantFeePaid, initialState);
  return <>
    <form action={action}><input type="hidden" name="fee_id" value={feeId}/><input type="hidden" name="participant_id" value={participantId}/><button disabled={pending || state.ok} className={`focus-ring rounded-xl bg-[var(--brand)] font-bold text-[#07110d] disabled:opacity-60 ${compact ? "px-3 py-2 text-xs" : "min-h-11 px-4 text-sm"}`}>{pending ? "Processando..." : state.ok ? "Pago" : "Marcar como pago"}</button></form>
    <ActionToast message={state.message} success={state.ok}/>
  </>;
}
