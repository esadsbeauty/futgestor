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
    { data: guestConfirmations },
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

    s
      .from("game_guest_confirmations")
      .select("game_id,attendance_status,payment_status")
      .eq("organization_id", org)
      .eq("attendance_status", "confirmed"),
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
      ),
      (guestConfirmations ?? []).filter(
        (x) => x.game_id === g.id
      ).length * Number(g.player_price),
      (guestConfirmations ?? []).filter(
        (x) => x.game_id === g.id && x.payment_status === "paid"
      ).length * Number(g.player_price)
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
    { data: { user: currentUser } },
  ] = await Promise.all([
    s
      .from("players")
      .select("id,name,user_id,default_position")
      .eq("organization_id", org)
      .eq("status", "active")
      .order("name"),

    s
      .from("game_attendances")
      .select(
        "player_id,status,responded_at,position,team_number"
      )
      .eq("organization_id", org)
      .eq("game_id", game),

    s.auth.getUser(),
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
      is_current_user: player.user_id === currentUser?.id,
      position: (response?.position as GameAttendancePlayer["position"]) ?? null,
      default_position: (player.default_position as GameAttendancePlayer["default_position"]) ?? null,
      team_number: response?.team_number ?? null,
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

  const [
    { data: guests, error: guestsError },
    { data: attendances, error: attendancesError },
    { data: players, error: playersError },
    { data: charges },
  ] = await Promise.all([
    supabase
      .from("game_guest_confirmations")
      .select("*")
      .eq("organization_id", org)
      .eq("game_id", game),
    supabase
      .from("game_attendances")
      .select("id,organization_id,game_id,player_id,status,sport_type,position,team_number,responded_at,created_at,updated_at")
      .eq("organization_id", org)
      .eq("game_id", game),
    supabase
      .from("players")
      .select("id,name")
      .eq("organization_id", org),
    supabase
      .from("game_charges")
      .select("player_id,status,paid_at,transaction_id")
      .eq("organization_id", org)
      .eq("game_id", game),
  ]);

  if (guestsError || attendancesError || playersError) {
    throw new Error("Não foi possível carregar os jogadores confirmados.");
  }

  const playerNames = new Map((players ?? []).map((player) => [player.id, player.name]));
  const chargeByPlayer = new Map((charges ?? []).map((charge) => [charge.player_id, charge]));

  const guestRows: GameRosterPlayer[] = ((guests ?? []) as GameGuestConfirmation[]).map((guest) => ({
    ...guest,
    source: "guest",
  }));

  const guestLinkedPlayers = new Set(
    guestRows
      .filter((guest) => guest.player_id)
      .map((guest) => guest.player_id as string)
  );

  const attendanceRows: GameRosterPlayer[] = (attendances ?? [])
    .filter((attendance) => !guestLinkedPlayers.has(attendance.player_id))
    .map((attendance) => {
      const charge = chargeByPlayer.get(attendance.player_id);
      return {
        id: attendance.id,
        source: "participant",
        organization_id: attendance.organization_id,
        game_id: attendance.game_id,
        name: playerNames.get(attendance.player_id) ?? "Participante",
        attendance_status: attendance.status as "confirmed" | "declined",
        sport_type: attendance.sport_type as GameRosterPlayer["sport_type"],
        position: attendance.position as GameRosterPlayer["position"],
        team_number: attendance.team_number,
        player_id: attendance.player_id,
        payment_status: charge?.status === "paid" ? "paid" : "pending",
        paid_at: charge?.paid_at ?? null,
        payment_transaction_id: charge?.transaction_id ?? null,
        created_at: attendance.created_at,
        updated_at: attendance.updated_at,
      };
    });

  return [...guestRows, ...attendanceRows].sort((a, b) =>
    a.created_at.localeCompare(b.created_at)
  );
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
