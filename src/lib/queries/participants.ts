import { notFound, redirect } from "next/navigation";
import { participantFinancialSummary, participantMonthStatus } from "@/lib/finance";
import { bahiaReferenceMonth } from "@/lib/timezone";
import { createClient } from "@/lib/supabase/server";
import type { MonthlyFee, Organization, Participant, ParticipantFinancialSummary, ParticipantWithCurrentFee } from "@/types/participants";
import type { BillingMode } from "@/types/billing";

export function currentReferenceMonth(date = new Date()) {
  return bahiaReferenceMonth(date);
}

export async function getCurrentOrganizationForUser(): Promise<Organization> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("organization_members")
    .select("organization_id, organizations!inner(id,name,default_monthly_fee,default_due_day,billing_mode,show_cash_balance,show_receivables,show_payables,show_pending_players,show_individual_values)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("Não foi possível carregar a organização.");
  if (!data) throw new Error("Sua conta ainda não possui uma organização.");
  const organization = data.organizations as unknown as Organization;
  return organization;
}

export async function ensureCurrentMonthFees(organizationId: string, referenceMonth = currentReferenceMonth()) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("ensure_month_fees", { _org: organizationId, _month: referenceMonth });
  if (error) throw new Error("Não foi possível preparar as mensalidades do mês.");
}

export async function getParticipants(organizationId: string, referenceMonth = currentReferenceMonth(), billingMode: BillingMode = "monthly"): Promise<ParticipantWithCurrentFee[]> {
  const supabase = await createClient();
  const [{ data: players, error: playersError }, { data: fees, error: feesError }] = await Promise.all([
    supabase.from("players").select("*").eq("organization_id", organizationId).order("name"),
    supabase.from("monthly_fees").select("*").eq("organization_id", organizationId).eq("reference_month", referenceMonth),
  ]);
  if (playersError || feesError) throw new Error("Não foi possível carregar os participantes.");
  const currentFees = new Map((fees as MonthlyFee[] | null)?.map((fee) => [fee.player_id, fee]));
  return ((players ?? []) as Participant[]).map((participant) => {
    const currentFee = currentFees.get(participant.id) ?? null;
    return { ...participant, currentFee, financialStatus: participantMonthStatus(participant.status, currentFee, new Date(), billingMode, participant.billing_type) };
  });
}

export async function getParticipantById(organizationId: string, participantId: string): Promise<Participant> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("players").select("*").eq("organization_id", organizationId).eq("id", participantId).maybeSingle();
  if (error) throw new Error("Não foi possível carregar o participante.");
  if (!data) notFound();
  return data as Participant;
}

export async function getParticipantFees(organizationId: string, participantId: string): Promise<MonthlyFee[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("monthly_fees").select("*").eq("organization_id", organizationId).eq("player_id", participantId).order("reference_month", { ascending: false });
  if (error) throw new Error("Não foi possível carregar o histórico de mensalidades.");
  return (data ?? []) as MonthlyFee[];
}

export function getParticipantSummary(fees: MonthlyFee[]): ParticipantFinancialSummary {
  return participantFinancialSummary(fees);
}


export type ParticipantGameHistoryEntry = {
  game_id: string;
  title: string;
  game_date: string;
  start_time: string | null;
  status: string;
  position: import("@/types/games").GuestPosition | null;
  team_number: number | null;
  payment_status: "pending" | "paid" | "not_required";
  amount: number;
  goals: number;
  yellow_cards: number;
  red_cards: number;
};

export async function getParticipantGameHistory(
  organizationId: string,
  participantId: string
): Promise<ParticipantGameHistoryEntry[]> {
  const supabase = await createClient();

  const [
    { data: roster, error: rosterError },
    { data: games, error: gamesError },
    { data: events, error: eventsError },
    { data: guestLinks, error: guestLinksError },
  ] = await Promise.all([
    supabase
      .from("game_players")
      .select("game_id,position,team_number,payment_status,amount")
      .eq("organization_id", organizationId)
      .eq("player_id", participantId)
      .order("created_at", { ascending: false }),
    supabase
      .from("games")
      .select("id,title,game_date,start_time,status")
      .eq("organization_id", organizationId),
    supabase
      .from("game_events")
      .select("game_id,player_id,guest_confirmation_id,event_type,quantity")
      .eq("organization_id", organizationId),
    supabase
      .from("game_guest_confirmations")
      .select("id,player_id")
      .eq("organization_id", organizationId)
      .eq("player_id", participantId),
  ]);

  if (rosterError || gamesError || eventsError || guestLinksError) {
    throw new Error("Não foi possível carregar o histórico de jogos do participante.");
  }

  const gamesById = new Map((games ?? []).map((game) => [game.id, game]));
  const linkedGuestIds = new Set((guestLinks ?? []).map((guest) => guest.id));

  return (roster ?? []).map((entry) => {
    const game = gamesById.get(entry.game_id);
    const gameEvents = (events ?? []).filter(
      (event) =>
        event.game_id === entry.game_id &&
        (event.player_id === participantId ||
          (event.guest_confirmation_id && linkedGuestIds.has(event.guest_confirmation_id)))
    );

    const sum = (type: "goal" | "yellow_card" | "red_card") =>
      gameEvents
        .filter((event) => event.event_type === type)
        .reduce((total, event) => total + Number(event.quantity ?? 0), 0);

    return {
      game_id: entry.game_id,
      title: game?.title ?? "Jogo",
      game_date: game?.game_date ?? "",
      start_time: game?.start_time ?? null,
      status: game?.status ?? "scheduled",
      position: entry.position as ParticipantGameHistoryEntry["position"],
      team_number: entry.team_number,
      payment_status: entry.payment_status as ParticipantGameHistoryEntry["payment_status"],
      amount: Number(entry.amount ?? 0),
      goals: sum("goal"),
      yellow_cards: sum("yellow_card"),
      red_cards: sum("red_card"),
    };
  });
}
