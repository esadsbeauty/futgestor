"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { participantSchema } from "@/lib/validators/participant";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
    default_futsal_position: formData.get("default_futsal_position") ? String(formData.get("default_futsal_position")) : null,
    default_field_position: formData.get("default_field_position") ? String(formData.get("default_field_position")) : null,
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
    const { error } = await supabase.from("players").insert({
      ...parsed.data,
      default_position: parsed.data.default_futsal_position ?? parsed.data.default_field_position,
      billing_type: billingType,
      organization_id: organization.id,
    });
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
    const { data, error } = await supabase.from("players").update({
      ...parsed.data,
      default_position: parsed.data.default_futsal_position ?? parsed.data.default_field_position,
      billing_type: billingType,
    }).eq("id", participantId).eq("organization_id", organization.id).select("id").maybeSingle();
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


export async function deleteParticipant(formData: FormData) {
  const participantId = String(formData.get("participant_id") ?? "");
  if (!participantId) return;

  const organization = await getCurrentOrganizationForUser();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organization.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    throw new Error("Sem permissão para excluir participantes.");
  }

  const { data: participant, error: participantError } = await supabase
    .from("players")
    .select("id,user_id,name")
    .eq("id", participantId)
    .eq("organization_id", organization.id)
    .maybeSingle();

  if (participantError || !participant) {
    throw new Error("Participante não encontrado.");
  }

  const admin = createAdminClient();

  // game_charges uses RESTRICT for player_id, so remove those rows first.
  const { error: chargesError } = await admin
    .from("game_charges")
    .delete()
    .eq("organization_id", organization.id)
    .eq("player_id", participant.id);

  if (chargesError) {
    throw new Error("Não foi possível remover as cobranças vinculadas ao participante.");
  }

  const { error: playerDeleteError } = await admin
    .from("players")
    .delete()
    .eq("id", participant.id)
    .eq("organization_id", organization.id);

  if (playerDeleteError) {
    throw new Error("Não foi possível excluir o participante.");
  }

  if (participant.user_id) {
    const [{ data: otherPlayers }, { data: memberships }] = await Promise.all([
      admin
        .from("players")
        .select("id")
        .eq("user_id", participant.user_id)
        .limit(1),
      admin
        .from("organization_members")
        .select("id")
        .eq("user_id", participant.user_id)
        .limit(1),
    ]);

    const stillUsed =
      Boolean(otherPlayers?.length) ||
      Boolean(memberships?.length);

    if (!stillUsed) {
      await admin.auth.admin.deleteUser(participant.user_id);
    }
  }

  revalidatePath("/participantes");
  revalidatePath("/dashboard");
  revalidatePath("/financeiro");
  revalidatePath("/jogos");

  redirect("/participantes");
}
