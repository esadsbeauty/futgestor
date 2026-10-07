import { createClient } from "@/lib/supabase/server";
import { sortPortalGames } from "@/lib/player-portal";
import type { PlayerAccessToken, PlayerPortal, PlayerPortalGame } from "@/types/player-portal";

export async function getPlayerPortal(token: string): Promise<{ portal: PlayerPortal; games: PlayerPortalGame[] } | null> {
  const supabase = await createClient();
  const [{ data: portalData, error: portalError }, { data: gamesData, error: gamesError }] = await Promise.all([
    supabase.rpc("get_player_portal", { _token: token }),
    supabase.rpc("get_player_portal_games", { _token: token }),
  ]);
  if (portalError || gamesError || !portalData?.[0]?.available) return null;
  return { portal: portalData[0] as PlayerPortal, games: sortPortalGames((gamesData ?? []) as PlayerPortalGame[]) };
}

export async function getParticipantAccess(organizationId: string, playerId: string): Promise<PlayerAccessToken | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("player_access_tokens").select("*").eq("organization_id", organizationId).eq("player_id", playerId).eq("active", true).maybeSingle();
  if (error) throw new Error("Não foi possível carregar o acesso do participante.");
  return data as PlayerAccessToken | null;
}
