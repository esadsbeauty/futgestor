import { notFound } from "next/navigation";
import { gameFinancialSummary } from "@/lib/games";
import { createClient } from "@/lib/supabase/server";
import type { BillingMode } from "@/types/billing";
import type {
  Game,
  GameAttendancePlayer,
  GameAttendanceSummary,
  GameCharge,
  GameExpense,
  GameEvent,
  GameWithSummary,
} from "@/types/games";
import type { Participant } from "@/types/participants";

export async function listGames(
  org: string
): Promise<GameWithSummary[]> {
  const s = await createClient();

  const [
    { data: games, error },
    { data: charges },
    { data: expenses },
  ] = await Promise.all([
    s
      .from("games")
      .select("*")
      .eq("organization_id", org)
      .order("game_date", { ascending: false }),

    s
      .from("game_charges")
      .select("*")
      .eq("organization_id", org),

    s
      .from("game_expenses")
      .select("*")
      .eq("organization_id", org),
  ]);

  if (error) {
    throw new Error(
      "Não foi possível carregar os jogos."
    );
  }

  return ((games ?? []) as Game[]).map((g) => ({
    ...g,
    summary: gameFinancialSummary(
      ((charges ?? []) as GameCharge[]).filter(
        (x) => x.game_id === g.id
      ),
      ((expenses ?? []) as GameExpense[]).filter(
        (x) => x.game_id === g.id
      )
    ),
  }));
}

export async function getGameById(
  org: string,
  id: string
): Promise<Game> {
  const s = await createClient();

  const { data, error } = await s
    .from("games")
    .select("*")
    .eq("organization_id", org)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(
      "Não foi possível carregar o jogo."
    );
  }

  if (!data) notFound();

  return data as Game;
}

export async function getGameCharges(
  org: string,
  game: string
): Promise<GameCharge[]> {
  const s = await createClient();

  const [
    { data, error },
    { data: players },
  ] = await Promise.all([
    s
      .from("game_charges")
      .select("*")
      .eq("organization_id", org)
      .eq("game_id", game)
      .order("created_at"),

    s
      .from("players")
      .select("id,name")
      .eq("organization_id", org),
  ]);

  if (error) {
    throw new Error(
      "Não foi possível carregar as cobranças."
    );
  }

  const names = new Map(
    (players ?? []).map((p) => [p.id, p.name])
  );

  return ((data ?? []) as GameCharge[]).map((c) => ({
    ...c,
    playerName:
      names.get(c.player_id) ?? "Participante",
  }));
}

export async function getGameExpenses(
  org: string,
  game: string
): Promise<GameExpense[]> {
  const s = await createClient();

  const { data, error } = await s
    .from("game_expenses")
    .select("*")
    .eq("organization_id", org)
    .eq("game_id", game)
    .order("created_at");

  if (error) {
    throw new Error(
      "Não foi possível carregar as despesas."
    );
  }

  return (data ?? []) as GameExpense[];
}

export async function getEligiblePlayersForGame(
  org: string,
  mode: BillingMode,
  game: string
): Promise<Participant[]> {
  const s = await createClient();

  let q = s
    .from("players")
    .select("*")
    .eq("organization_id", org)
    .eq("status", "active")
    .order("name");

  if (mode === "hybrid") {
    q = q.eq("billing_type", "per_game");
  }

  const [
    { data, error },
    { data: charges },
  ] = await Promise.all([
    q,
    s
      .from("game_charges")
      .select("player_id")
      .eq("organization_id", org)
      .eq("game_id", game),
  ]);

  if (error) {
    throw new Error(
      "Não foi possível carregar os jogadores."
    );
  }

  const charged = new Set(
    (charges ?? []).map((x) => x.player_id)
  );

  return ((data ?? []) as Participant[]).filter(
    (p) => !charged.has(p.id)
  );
}

export async function getGameAttendanceSummary(
  org: string,
  game: string
): Promise<GameAttendanceSummary> {
  const s = await createClient();

  const [
    { data: players, error: playersError },
    { data: attendances, error: attendancesError },
  ] = await Promise.all([
    s
      .from("players")
      .select("id,name")
      .eq("organization_id", org)
      .eq("status", "active")
      .order("name"),

    s
      .from("game_attendances")
      .select(
        "player_id,status,responded_at"
      )
      .eq("organization_id", org)
      .eq("game_id", game),
  ]);

  if (playersError || attendancesError) {
    throw new Error(
      "Não foi possível carregar as presenças."
    );
  }

  const responses = new Map(
    (attendances ?? []).map((attendance) => [
      attendance.player_id,
      attendance,
    ])
  );

  const result: GameAttendancePlayer[] = (
    players ?? []
  ).map((player) => {
    const response = responses.get(player.id);

    return {
      player_id: player.id,
      player_name: player.name,
      status:
        (response?.status as
          | "confirmed"
          | "declined") ?? "pending",
      responded_at:
        response?.responded_at ?? null,
    };
  });

  return {
    confirmed: result.filter(
      (player) =>
        player.status === "confirmed"
    ).length,

    pending: result.filter(
      (player) => player.status === "pending"
    ).length,

    declined: result.filter(
      (player) =>
        player.status === "declined"
    ).length,

    players: result,
  };
}

export async function getGameEvents(
  org: string,
  game: string
): Promise<GameEvent[]> {
  const supabase = await createClient();

  const [
    { data: events, error: eventsError },
    { data: players, error: playersError },
  ] = await Promise.all([
    supabase
      .from("game_events")
      .select("*")
      .eq("organization_id", org)
      .eq("game_id", game)
      .order("created_at"),
    supabase
      .from("players")
      .select("id,name")
      .eq("organization_id", org),
  ]);

  if (eventsError || playersError) {
    throw new Error("Não foi possível carregar os destaques do jogo.");
  }

  const names = new Map((players ?? []).map((player) => [player.id, player.name]));

  return ((events ?? []) as GameEvent[]).map((event) => ({
    ...event,
    playerName: names.get(event.player_id) ?? "Participante",
  }));
}
