import { redirect } from "next/navigation";
import { getCurrentOrganizationForUser } from "@/lib/queries/participants";
import { createClient } from "@/lib/supabase/server";
import type { AdminInvite, OrganizationAdmin, SettingsData } from "@/types/settings";

export async function getSettingsData(): Promise<SettingsData> {
  const organization = await getCurrentOrganizationForUser();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profileResult, membershipResult] = await Promise.all([
    supabase.from("profiles").select("id,name,email").eq("id", user.id).maybeSingle(),
    supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", organization.id)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (profileResult.error || membershipResult.error) {
    throw new Error("Não foi possível carregar as configurações.");
  }

  if (!profileResult.data || !membershipResult.data) {
    throw new Error("Perfil não encontrado.");
  }

  const currentRole = membershipResult.data.role as "owner" | "admin" | "member";
  let admins: OrganizationAdmin[] = [];
  let adminInvites: AdminInvite[] = [];

  if (currentRole === "owner") {
    const [adminsResult, invitesResult] = await Promise.all([
      supabase.rpc("get_organization_admins", { _org: organization.id }),
      supabase
        .from("admin_invites")
        .select("id,email,token,expires_at,created_at")
        .eq("organization_id", organization.id)
        .eq("active", true)
        .is("accepted_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false }),
    ]);

    if (adminsResult.error || invitesResult.error) {
      throw new Error("Não foi possível carregar os administradores.");
    }

    admins = (adminsResult.data ?? []) as OrganizationAdmin[];
    adminInvites = (invitesResult.data ?? []) as AdminInvite[];
  }

  return {
    organization,
    profile: {
      id: profileResult.data.id,
      name: profileResult.data.name,
      email: profileResult.data.email ?? user.email ?? null,
    },
    currentRole,
    admins,
    adminInvites,
  };
}
