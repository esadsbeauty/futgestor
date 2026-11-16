import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sortPortalGames } from "@/lib/player-portal";
import type { PlayerAccessToken, PlayerPortal, PlayerPortalGame } from "@/types/player-portal";

export async function getPlayerPortal(token: string): Promise<{ portal: PlayerPortal; games: PlayerPortalGame[] } | null> {
  const supabase = await createClient();
  const [{ data: portalData, error: portalError }, { data: gamesData, error: gamesError }] = await Promise.all([
    supabase.rpc("get_player_portal", { _token: token }),
    supabase.rpc("get_player_portal_games", { _token: token }),
  ]);
  if (portalError || gamesError || !portalData?.[0]?.available) return null;
  const games = sortPortalGames((gamesData ?? []) as PlayerPortalGame[]);
  const organizationId = portalData[0].organization_id;
  const gameIds = games.filter((game) => game.status === "scheduled").map((game) => game.game_id);
  let tokens = new Map<string, string>();
  if (organizationId && gameIds.length) {
    const { data: invites, error: inviteError } = await createAdminClient().from("games")
      .select("id, public_invite_token").eq("organization_id", organizationId).eq("status", "scheduled").in("id", gameIds);
    if (inviteError) throw new Error("Não foi possível carregar os convites dos jogos.");
    tokens = new Map((invites ?? []).filter((game) => game.public_invite_token).map((game) => [game.id, game.public_invite_token]));
  }
  return { portal: portalData[0] as PlayerPortal, games: games.map((game) => ({ ...game, public_invite_token: tokens.get(game.game_id) ?? null })) };
}

export async function getParticipantAccess(organizationId: string, playerId: string): Promise<PlayerAccessToken | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("player_access_tokens").select("*").eq("organization_id", organizationId).eq("player_id", playerId).eq("active", true).maybeSingle();
  if (error) throw new Error("Não foi possível carregar o acesso do participante.");
  return data as PlayerAccessToken | null;
}
