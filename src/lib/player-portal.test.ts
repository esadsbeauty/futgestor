import { describe, expect, it } from "vitest";
import {
  hasOnlyPublicPortalFields,
  isPlayerAccessAvailable,
  sortPortalGames,
} from "./player-portal";
import { portalTokenSchema } from "./validators/player-portal";
import type { PlayerPortal, PlayerPortalGame } from "@/types/player-portal";

const portal: PlayerPortal = {
  organization_name: "Baba",
  player_name: "João",
  player_status: "active",
  billing_type: "monthly",
  monthly_fee: 50,
  due_day: 10,
  participant_since: "2026-01-01",
  available: true,
};

const game = (
  id: string,
  date: string,
  start: string | null
): PlayerPortalGame => ({
  game_id: id,
  title: "Baba",
  game_date: date,
  start_time: start,
  location: null,
  player_price: 10,
  status: "scheduled",
  attendance_status: "pending",
});

describe("player portal", () => {
  it("accepts active permanent access and rejects inactive or expired access", () => {
    expect(
      isPlayerAccessAvailable({
        active: true,
        expires_at: null,
      })
    ).toBe(true);

    expect(
      isPlayerAccessAvailable({
        active: false,
        expires_at: null,
      })
    ).toBe(false);

    expect(
      isPlayerAccessAvailable({
        active: true,
        expires_at: "2020-01-01T00:00:00Z",
      })
    ).toBe(false);
  });

  it("orders future games by date and time and supports an empty list", () => {
    expect(sortPortalGames([])).toEqual([]);

    expect(
      sortPortalGames([
        game("2", "2026-11-02", "20:00:00"),
        game("1", "2026-11-01", "21:00:00"),
      ]).map((item) => item.game_id)
    ).toEqual(["1", "2"]);
  });

  it("keeps the public payload free from administrative fields", () => {
    expect(hasOnlyPublicPortalFields(portal)).toBe(true);

    expect(
      hasOnlyPublicPortalFields({
        ...portal,
        owner_id: "secret",
      } as PlayerPortal)
    ).toBe(false);
  });

  it("represents monthly, per-game and hybrid player outcomes through billing type", () => {
    expect({
      ...portal,
      billing_type: "monthly" as const,
    }.billing_type).toBe("monthly");

    expect({
      ...portal,
      billing_type: "per_game" as const,
      monthly_fee: null,
      due_day: null,
    }.billing_type).toBe("per_game");
  });

  it("represents the attendance status of a portal game", () => {
    expect(
      game("1", "2026-11-01", "20:00:00").attendance_status
    ).toBe("pending");

    expect({
      ...game("2", "2026-11-02", "20:00:00"),
      attendance_status: "confirmed" as const,
    }.attendance_status).toBe("confirmed");

    expect({
      ...game("3", "2026-11-03", "20:00:00"),
      attendance_status: "declined" as const,
    }.attendance_status).toBe("declined");
  });

  it("rejects malformed public tokens", () => {
    expect(portalTokenSchema.safeParse("player-id").success).toBe(false);

    expect(
      portalTokenSchema.safeParse("a".repeat(60)).success
    ).toBe(true);
  });
});