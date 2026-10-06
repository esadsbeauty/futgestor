import { redirect } from "next/navigation";
import { getCurrentOrganizationForUser } from "@/lib/queries/participants";
import { createClient } from "@/lib/supabase/server";
import type { SettingsData } from "@/types/settings";

export async function getSettingsData(): Promise<SettingsData> {
  const organization = await getCurrentOrganizationForUser();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile, error } = await supabase.from("profiles").select("id,name,email").eq("id", user.id).maybeSingle();
  if (error) throw new Error("Não foi possível carregar o perfil.");
  if (!profile) throw new Error("Perfil não encontrado.");
  return { organization, profile: { id: profile.id, name: profile.name, email: profile.email ?? user.email ?? null } };
}
