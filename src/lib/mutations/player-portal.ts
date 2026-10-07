"use server";

import { revalidatePath } from "next/cache";
import { getCurrentOrganizationForUser } from "@/lib/queries/participants";
import { createClient } from "@/lib/supabase/server";
import { playerAccessMutationSchema } from "@/lib/validators/player-portal";

export type PlayerAccessActionState = { ok: boolean; message?: string; token?: string };

export async function regeneratePlayerAccess(_: PlayerAccessActionState, formData: FormData): Promise<PlayerAccessActionState> {
  const parsed = playerAccessMutationSchema.safeParse({ player_id: formData.get("player_id") });
  if (!parsed.success) return { ok: false, message: "Participante inválido." };
  const organization = await getCurrentOrganizationForUser();
  const supabase = await createClient();
  const { data: player } = await supabase.from("players").select("id").eq("id", parsed.data.player_id).eq("organization_id", organization.id).maybeSingle();
  if (!player) return { ok: false, message: "Participante não encontrado." };
  const { data, error } = await supabase.rpc("regenerate_player_access", { _player: player.id });
  if (error || !data) return { ok: false, message: "Não foi possível gerar o acesso." };
  revalidatePath(`/participantes/${player.id}`);
  return { ok: true, message: "Novo acesso gerado.", token: data as string };
}

export async function deactivatePlayerAccess(formData: FormData) {
  const parsed = playerAccessMutationSchema.safeParse({ player_id: formData.get("player_id") });
  if (!parsed.success) return;
  const organization = await getCurrentOrganizationForUser();
  const supabase = await createClient();
  const { data: player } = await supabase.from("players").select("id").eq("id", parsed.data.player_id).eq("organization_id", organization.id).maybeSingle();
  if (!player) return;
  await supabase.from("player_access_tokens").update({ active: false, updated_at: new Date().toISOString() }).eq("organization_id", organization.id).eq("player_id", player.id).eq("active", true);
  revalidatePath(`/participantes/${player.id}`);
}
