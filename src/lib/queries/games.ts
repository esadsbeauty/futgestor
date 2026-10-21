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
  GameGuestConfirmation,
  GameRosterPlayer,
  PublicGameInviteResponse,
  PublicGameTeamEntry,
  GameWithSummary,
} from "@/types/games";
import type { Participant } from "@/types/participants";

export async function listGames(
  org: string
): Promise<GameWithSummary[]> {
  const s = await createClient();

  const [
    { data: games, error: gamesError },
    { data: roster, error: rosterError },
    { data: expenses, error: expensesError },
  ] = await Promise.all([
    s.from("games").select("*").eq("organization_id", org).order("game_date", { ascending: false }),
    s.from("game_players")
      .select("game_id,amount,payment_status,attendance_status")
      .eq("organization_id", org)
      .eq("attendance_status", "confirmed"),
    s.from("game_expenses").select("*").eq("organization_id", org),
  ]);

  if (gamesError || rosterError || expensesError) {
    throw new Error("Não foi possível carregar os jogos.");
  }

  return ((games ?? []) as Game[]).map((game) => {
    const gameRoster = (roster ?? []).filter((player) => player.game_id === game.id);
    const expected = gameRoster.reduce((total, player) => total + Number(player.amount ?? 0), 0);
    const received = gameRoster
      .filter((player) => player.payment_status === "paid")
      .reduce((total, player) => total + Number(player.amount ?? 0), 0);

    return {
      ...game,
      summary: gameFinancialSummary(
        [],
        ((expenses ?? []) as GameExpense[]).filter((expense) => expense.game_id === game.id),
        expected,
        received
      ),
    };
  });
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
  _mode: BillingMode,
  game: string
): Promise<Participant[]> {
  const s = await createClient();

  const [
    { data: players, error: playersError },
    { data: roster, error: rosterError },
  ] = await Promise.all([
    s.from("players")
      .select("*")
      .eq("organization_id", org)
      .eq("status", "active")
      .order("name"),
    s.from("game_players")
      .select("player_id")
      .eq("organization_id", org)
      .eq("game_id", game)
      .not("player_id", "is", null),
  ]);

  if (playersError || rosterError) {
    throw new Error("Não foi possível carregar os jogadores.");
  }

  const alreadyInGame = new Set((roster ?? []).flatMap((row) => row.player_id ? [row.player_id] : []));

  return ((players ?? []) as Participant[]).filter(
    (player) => !alreadyInGame.has(player.id)
  );
}

export async function getGameAttendanceSummary(
  org: string,
  game: string
): Promise<GameAttendanceSummary> {
  const s = await createClient();

  const [
    { data: players, error: playersError },
    { data: roster, error: rosterError },
    { data: gameData, error: gameError },
    { data: { user: currentUser } },
  ] = await Promise.all([
    s.from("players")
      .select("id,name,user_id,default_position,default_futsal_position,default_field_position")
      .eq("organization_id", org)
      .eq("status", "active")
      .order("name"),
    s.from("game_players")
      .select("player_id,attendance_status,position,team_number,updated_at")
      .eq("organization_id", org)
      .eq("game_id", game)
      .not("player_id", "is", null),
    s.from("games")
      .select("game_format")
      .eq("organization_id", org)
      .eq("id", game)
      .maybeSingle(),
    s.auth.getUser(),
  ]);

  if (playersError || rosterError || gameError || !gameData) {
    throw new Error("Não foi possível carregar as presenças.");
  }

  const responses = new Map(
    (roster ?? []).map((entry) => [entry.player_id, entry])
  );

  const result: GameAttendancePlayer[] = (players ?? []).map((player) => {
    const response = responses.get(player.id);
    const savedPosition = gameData.game_format === "field"
      ? player.default_field_position ?? player.default_position
      : player.default_futsal_position ?? player.default_position;

    return {
      player_id: player.id,
      player_name: player.name,
      status: (response?.attendance_status as "confirmed" | "declined") ?? "pending",
      responded_at: response?.updated_at ?? null,
      is_current_user: player.user_id === currentUser?.id,
      position: (response?.position as GameAttendancePlayer["position"]) ?? null,
      default_position: (savedPosition as GameAttendancePlayer["default_position"]) ?? null,
      team_number: response?.team_number ?? null,
    };
  });

  return {
    confirmed: result.filter((player) => player.status === "confirmed").length,
    pending: result.filter((player) => player.status === "pending").length,
    declined: result.filter((player) => player.status === "declined").length,
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
    { data: guests, error: guestsError },
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
    supabase.from("game_guest_confirmations").select("id,name")
      .eq("organization_id", org).eq("game_id", game),
  ]);

  if (eventsError || playersError || guestsError) {
    throw new Error("Não foi possível carregar os destaques do jogo.");
  }

  const names = new Map((players ?? []).map((player) => [player.id, player.name]));
  const guestNames = new Map((guests ?? []).map((guest) => [guest.id, guest.name]));

  return ((events ?? []) as GameEvent[]).map((event) => ({
    ...event,
    playerName: (event.player_id ? names.get(event.player_id) : guestNames.get(event.guest_confirmation_id)) ?? "Jogador",
  }));
}

export async function getGameGuestConfirmations(
  org: string,
  game: string
): Promise<GameGuestConfirmation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("game_guest_confirmations")
    .select("*")
    .eq("organization_id", org)
    .eq("game_id", game)
    .order("created_at");

  if (error) {
    throw new Error("Não foi possível carregar as confirmações públicas.");
  }

  return (data ?? []) as GameGuestConfirmation[];
}

export async function getGameRosterPlayers(
  org: string,
  game: string
): Promise<GameRosterPlayer[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("game_players")
    .select("*")
    .eq("organization_id", org)
    .eq("game_id", game)
    .order("created_at");

  if (error) {
    throw new Error("Não foi possível carregar os jogadores do jogo.");
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    source: row.source as "guest" | "participant",
    organization_id: row.organization_id,
    game_id: row.game_id,
    name: row.name,
    attendance_status: row.attendance_status as "confirmed" | "declined",
    sport_type: row.sport_type as GameRosterPlayer["sport_type"],
    position: row.position as GameRosterPlayer["position"],
    team_number: row.team_number,
    player_id: row.player_id,
    guest_confirmation_id: row.guest_confirmation_id,
    amount: Number(row.amount ?? 0),
    payment_status: row.payment_status as GameRosterPlayer["payment_status"],
    paid_at: row.paid_at,
    payment_transaction_id: row.transaction_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

export async function getPublicGameInvite(token: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_game_invite", {
    _token: token,
  });

  if (error) return null;
  return data?.[0] ?? null;
}

export async function getPublicGameInviteResponses(
  token: string
): Promise<PublicGameInviteResponse[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_game_invite_responses", {
    _token: token,
  });

  if (error) return [];
  return (data ?? []) as PublicGameInviteResponse[];
}


export async function getPublicGameTeams(
  token: string
): Promise<PublicGameTeamEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_game_teams", {
    _token: token,
  });

  if (error) return [];
  return (data ?? []) as PublicGameTeamEntry[];
}


export async function getPublicGameRoster(
  token: string
): Promise<PublicGameTeamEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_game_roster", {
    _token: token,
  });

  if (error) return [];
  return (data ?? []) as PublicGameTeamEntry[];
}
