"use client";

import { Trash2 } from "lucide-react";
import { deleteParticipant } from "@/lib/mutations/participants";

export function ParticipantDeleteButton({
  participantId,
  participantName,
}: {
  participantId: string;
  participantName: string;
}) {
  return (
    <form
      action={deleteParticipant}
      onSubmit={(event) => {
        const confirmed = window.confirm(
          `Excluir ${participantName} permanentemente?\n\nO cadastro, mensalidades, presença, estatísticas e acesso do participante serão removidos. Movimentações financeiras já registradas serão preservadas no histórico do grupo.`
        );

        if (!confirmed) event.preventDefault();
      }}
    >
      <input type="hidden" name="participant_id" value={participantId} />
      <button
        type="submit"
        className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-4 text-sm font-bold text-[var(--danger)]"
      >
        <Trash2 size={17} />
        Excluir participante
      </button>
    </form>
  );
}
