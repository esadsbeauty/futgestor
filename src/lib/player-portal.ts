import type { PlayerAccessToken, PlayerPortal, PlayerPortalGame } from "@/types/player-portal";

export function isPlayerAccessAvailable(access: Pick<PlayerAccessToken, "active" | "expires_at">, now = new Date()) {
  return access.active && (!access.expires_at || new Date(access.expires_at) > now);
}

export function sortPortalGames(games: PlayerPortalGame[]) {
  return [...games].sort((a, b) => `${a.game_date}T${a.start_time ?? "23:59:59"}`.localeCompare(`${b.game_date}T${b.start_time ?? "23:59:59"}`));
}

export function hasOnlyPublicPortalFields(value: PlayerPortal) {
  const allowed = new Set(["organization_name", "player_name", "player_status", "billing_type", "monthly_fee", "due_day", "participant_since", "available"]);
  return Object.keys(value).every((key) => allowed.has(key));
}
