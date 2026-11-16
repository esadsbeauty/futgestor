"use server";
import { revalidatePath } from "next/cache";
import { getCurrentOrganizationForUser } from "@/lib/queries/participants";
import { createClient } from "@/lib/supabase/server";

export async function saveTechnicalLevel(
  _: { ok: boolean; message: string },
  formData: FormData
): Promise<{ ok: boolean; message: string }> {
  const playerId = String(formData.get("player_id") ?? "");
  const level = Number(formData.get("technical_level"));
  if (!playerId || !Number.isInteger(level) || level < 1 || level > 5)
    return { ok: false, message: "Selecione um nível de 1 a 5." };

  try {
    const organization = await getCurrentOrganizationForUser();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "Sessão expirada." };
    const { data: membership } = await supabase.from("organization_members")
      .select("role").eq("organization_id", organization.id)
      .eq("user_id", user.id).maybeSingle();
    if (!membership || !["owner", "admin"].includes(membership.role))
      return { ok: false, message: "Apenas administradores podem avaliar jogadores." };
    const { data, error } = await supabase.from("players")
      .update({ technical_level: level }).eq("id", playerId)
      .eq("organization_id", organization.id).select("id").maybeSingle();
    if (error || !data) return { ok: false, message: "Não foi possível salvar o nível." };
    revalidatePath(`/participantes/${playerId}`);
    return { ok: true, message: "Nível técnico atualizado." };
  } catch {
    return { ok: false, message: "Não foi possível salvar o nível." };
  }
}
