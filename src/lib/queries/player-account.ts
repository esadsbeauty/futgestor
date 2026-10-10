import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type {
  PlayerAccountData,
  PlayerAccountFinance,
  PlayerAccountGame,
  PlayerAccountPortal,
  PlayerPendingAmount,
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
  ] = await Promise.all([
    supabase.rpc("get_my_player_portal"),
    supabase.rpc("get_my_player_games"),
    supabase.rpc("get_my_group_finance"),
    supabase.rpc("get_my_group_pending_players"),
    supabase.rpc("get_my_recent_game_events"),
  ]);

  if (
    portalError ||
    gamesError ||
    financeError ||
    pendingError ||
    eventsError ||
    !portalData?.[0]?.available
  ) {
    throw new Error("Não foi possível carregar sua área de participante.");
  }

  return {
    portal: portalData[0] as PlayerAccountPortal,
    games: (gamesData ?? []) as PlayerAccountGame[],
    finance: (financeData?.[0] as PlayerAccountFinance | undefined) ?? null,
    pendingPlayers: (pendingData ?? []) as PlayerPendingAmount[],
    recentEvents: (eventsData ?? []) as PlayerRecentGameEvent[],
  };
}
