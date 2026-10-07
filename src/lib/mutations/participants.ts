"use server";

import { revalidatePath } from "next/cache";
import { participantSchema } from "@/lib/validators/participant";
import { createClient } from "@/lib/supabase/server";
import { currentReferenceMonth, getCurrentOrganizationForUser } from "@/lib/queries/participants";
import { effectivePlayerBillingType, shouldGenerateMonthlyFee } from "@/lib/billing";

export type ParticipantActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

const initialError = (message: string): ParticipantActionState => ({ ok: false, message });

function participantPayload(formData: FormData) {
  return {
    name: formData.get("name"),
    phone: formData.get("phone") ?? "",
    monthly_fee: formData.get("monthly_fee"),
    due_day: formData.get("due_day"),
    joined_at: formData.get("joined_at"),
    status: formData.get("status"),
    billing_type: formData.get("billing_type") ?? "monthly",
    notes: formData.get("notes") ?? "",
  };
}

export async function createParticipant(_: ParticipantActionState, formData: FormData): Promise<ParticipantActionState> {
  const parsed = participantSchema.safeParse(participantPayload(formData));
  if (!parsed.success) return { ok: false, message: "Revise os campos destacados.", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const organization = await getCurrentOrganizationForUser();
    const supabase = await createClient();
    const billingType = effectivePlayerBillingType(organization.billing_mode, parsed.data.billing_type);
    const { error } = await supabase.from("players").insert({ ...parsed.data, billing_type: billingType, organization_id: organization.id });
    if (error) return initialError("Não foi possível cadastrar o participante.");
    if (parsed.data.status === "active" && shouldGenerateMonthlyFee(organization.billing_mode, billingType)) {
      const { error: feeError } = await supabase.rpc("ensure_month_fees", { _org: organization.id, _month: currentReferenceMonth() });
      if (feeError) {
        revalidatePath("/participantes");
        return { ok: true, message: "Participante criado. A mensalidade será preparada ao recarregar a lista." };
      }
    }
    revalidatePath("/participantes");
    return { ok: true, message: "Participante adicionado com sucesso." };
  } catch {
    return initialError("Não foi possível cadastrar o participante.");
  }
}

export async function updateParticipant(_: ParticipantActionState, formData: FormData): Promise<ParticipantActionState> {
  const participantId = String(formData.get("participant_id") ?? "");
  if (!participantId) return initialError("Participante inválido.");
  const parsed = participantSchema.safeParse(participantPayload(formData));
  if (!parsed.success) return { ok: false, message: "Revise os campos destacados.", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const organization = await getCurrentOrganizationForUser();
    const supabase = await createClient();
    const billingType = effectivePlayerBillingType(organization.billing_mode, parsed.data.billing_type);
    const { data, error } = await supabase.from("players").update({ ...parsed.data, billing_type: billingType }).eq("id", participantId).eq("organization_id", organization.id).select("id").maybeSingle();
    if (error || !data) return initialError("Participante não encontrado ou sem permissão para editar.");
    // Existing monthly_fees are intentionally untouched; the new defaults only affect future generations.
    if (parsed.data.status === "active" && shouldGenerateMonthlyFee(organization.billing_mode, billingType)) await supabase.rpc("ensure_month_fees", { _org: organization.id, _month: currentReferenceMonth() });
    revalidatePath("/participantes");
    revalidatePath(`/participantes/${participantId}`);
    return { ok: true, message: "Participante atualizado com sucesso." };
  } catch {
    return initialError("Não foi possível atualizar o participante.");
  }
}

export async function markParticipantFeePaid(_: ParticipantActionState, formData: FormData): Promise<ParticipantActionState> {
  const feeId = String(formData.get("fee_id") ?? "");
  const participantId = String(formData.get("participant_id") ?? "");
  if (!feeId || !participantId) return initialError("Mensalidade inválida.");
  try {
    const organization = await getCurrentOrganizationForUser();
    const supabase = await createClient();
    const { data: fee } = await supabase.from("monthly_fees").select("id").eq("id", feeId).eq("player_id", participantId).eq("organization_id", organization.id).maybeSingle();
    if (!fee) return initialError("Mensalidade não encontrada ou sem permissão.");
    const { error } = await supabase.rpc("mark_fee_paid", { _fee: feeId });
    if (error) return initialError("Não foi possível marcar a mensalidade como paga.");
    revalidatePath("/participantes");
    revalidatePath(`/participantes/${participantId}`);
    revalidatePath("/dashboard");
    return { ok: true, message: "Mensalidade marcada como paga." };
  } catch {
    return initialError("Não foi possível marcar a mensalidade como paga.");
  }
}
