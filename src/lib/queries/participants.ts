import { notFound, redirect } from "next/navigation";
import { participantFinancialSummary, participantMonthStatus } from "@/lib/finance";
import { createClient } from "@/lib/supabase/server";
import type { MonthlyFee, Organization, Participant, ParticipantFinancialSummary, ParticipantWithCurrentFee } from "@/types/participants";

export function currentReferenceMonth(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export async function getCurrentOrganizationForUser(): Promise<Organization> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("organization_members")
    .select("organization_id, organizations!inner(id,name,default_monthly_fee,default_due_day)")
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

export async function getParticipants(organizationId: string, referenceMonth = currentReferenceMonth()): Promise<ParticipantWithCurrentFee[]> {
  const supabase = await createClient();
  const [{ data: players, error: playersError }, { data: fees, error: feesError }] = await Promise.all([
    supabase.from("players").select("*").eq("organization_id", organizationId).order("name"),
    supabase.from("monthly_fees").select("*").eq("organization_id", organizationId).eq("reference_month", referenceMonth),
  ]);
  if (playersError || feesError) throw new Error("Não foi possível carregar os participantes.");
  const currentFees = new Map((fees as MonthlyFee[] | null)?.map((fee) => [fee.player_id, fee]));
  return ((players ?? []) as Participant[]).map((participant) => {
    const currentFee = currentFees.get(participant.id) ?? null;
    return { ...participant, currentFee, financialStatus: participantMonthStatus(participant.status, currentFee) };
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
