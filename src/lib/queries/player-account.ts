import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  PlayerAccountData,
  PlayerAccountFinance,
  PlayerAccountGame,
  PlayerAccountPortal,
  PlayerGoalRankingEntry,
  PlayerGameHistoryEntry,
  PlayerGamePaymentEntry,
  PlayerPendingAmount,
  PlayerConfirmedRosterEntry,
  PlayerRecentGameEvent,
} from "@/types/player-account";

export async function getMyPlayerAccount(): Promise<PlayerAccountData> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [
    { data: portalData, error: portalError },
    { data: gamesData, error: gamesError },
    { data: financeData, error: financeError },
    { data: pendingData, error: pendingError },
    { data: eventsData, error: eventsError },
    { data: rankingData, error: rankingError },
    { data: historyData, error: historyError },
    { data: paymentsData, error: paymentsError },
    { data: rosterData, error: rosterError },
    { data: defaultPositionsData, error: defaultPositionsError },
  ] = await Promise.all([
    supabase.rpc("get_my_player_portal"),
    supabase.rpc("get_my_player_games"),
    supabase.rpc("get_my_group_finance"),
    supabase.rpc("get_my_group_pending_players"),
    supabase.rpc("get_my_recent_game_events"),
    supabase.rpc("get_my_goal_ranking"),
    supabase.rpc("get_my_player_game_history"),
    supabase.rpc("get_my_game_payment_transparency"),
    supabase.rpc("get_my_confirmed_game_roster"),
    supabase.rpc("get_my_player_default_positions"),
  ]);

  if (
    portalError ||
    gamesError ||
    financeError ||
    pendingError ||
    eventsError ||
    rankingError ||
    historyError ||
    paymentsError ||
    rosterError ||
    defaultPositionsError ||
    !portalData?.[0]?.available
  ) {
    throw new Error("Não foi possível carregar sua área de participante.");
  }

  const portal = portalData[0] as PlayerAccountPortal;
  const visibleGames = (gamesData ?? []) as PlayerAccountGame[];
  const scheduledIds = visibleGames.filter((game) => !game.attendance_locked).map((game) => game.game_id);
  const { data: invites, error: invitesError } = scheduledIds.length
    ? await createAdminClient().from("games").select("id, public_invite_token").eq("organization_id", portal.organization_id).eq("status", "scheduled").in("id", scheduledIds)
    : { data: [], error: null };
  if (invitesError) throw new Error("Não foi possível carregar os links dos jogos.");
  const inviteTokens = new Map((invites ?? []).map((game) => [game.id, game.public_invite_token]));

  return {
    portal,
    games: visibleGames.map((game) => ({ ...game, public_invite_token: inviteTokens.get(game.game_id) ?? null })),
    finance: (financeData?.[0] as PlayerAccountFinance | undefined) ?? null,
    pendingPlayers: (pendingData ?? []) as PlayerPendingAmount[],
    recentEvents: (eventsData ?? []) as PlayerRecentGameEvent[],
    goalRanking: (rankingData ?? []) as PlayerGoalRankingEntry[],
    gameHistory: (historyData ?? []) as PlayerGameHistoryEntry[],
    gamePayments: (paymentsData ?? []) as PlayerGamePaymentEntry[],
    confirmedRoster: (rosterData ?? []) as PlayerConfirmedRosterEntry[],
    defaultPositions: {
      futsal: (defaultPositionsData?.[0]?.futsal_position as PlayerAccountData["defaultPositions"]["futsal"]) ?? null,
      field: (defaultPositionsData?.[0]?.field_position as PlayerAccountData["defaultPositions"]["field"]) ?? null,
    },
  };
}
