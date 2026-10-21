import type { GameAttendancePlayer, GameGuestConfirmation } from "@/types/games";

export function gameEventPlayers(
  participants: Pick<GameAttendancePlayer, "player_id" | "player_name">[],
  guests: Pick<GameGuestConfirmation, "id" | "name" | "player_id" | "attendance_status">[],
) {
  const players = new Map(participants.map((player) => [
    player.player_id,
    { id: player.player_id, name: player.player_name, guest: false },
  ]));
  for (const guest of guests) {
    if (guest.attendance_status !== "confirmed") continue;
    const id = guest.player_id ?? `guest:${guest.id}`;
    if (!players.has(id)) players.set(id, { id, name: guest.name, guest: !guest.player_id });
  }
  return [...players.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}
