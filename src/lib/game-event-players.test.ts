import { describe, expect, it } from "vitest";
import { gameEventPlayers } from "./game-event-players";

describe("game event players", () => {
  const participant = { player_id: "p1", player_name: "Elielson" };
  it("includes confirmed game-only players without requiring a permanent account", () => {
    expect(gameEventPlayers([participant], [
      { id: "g1", name: "Ana", player_id: null, attendance_status: "confirmed" },
      { id: "g2", name: "Não vai", player_id: null, attendance_status: "declined" },
    ])).toEqual([
      { id: "guest:g1", name: "Ana", guest: true },
      { id: "p1", name: "Elielson", guest: false },
    ]);
  });
  it("does not duplicate linked participants, but keeps different people with the same name", () => {
    const result = gameEventPlayers([participant], [
      { id: "g1", name: "Elielson", player_id: "p1", attendance_status: "confirmed" },
      { id: "g2", name: "Elielson", player_id: null, attendance_status: "confirmed" },
    ]);
    expect(result.map((player) => player.id)).toEqual(["p1", "guest:g2"]);
  });
});
