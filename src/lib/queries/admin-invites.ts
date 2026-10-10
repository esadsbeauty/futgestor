import { createClient } from "@/lib/supabase/server";

export type PublicAdminInvite = {
  organization_name: string;
  email: string;
  expires_at: string;
};

export async function getPublicAdminInvite(token: string): Promise<PublicAdminInvite | null> {
  if (!token || token.length < 20) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_admin_invite_public", {
    _token: token,
  });

  if (error) return null;
  return (data?.[0] as PublicAdminInvite | undefined) ?? null;
}
