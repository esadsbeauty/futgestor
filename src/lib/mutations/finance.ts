"use server";

import { revalidatePath } from "next/cache";
import { getCurrentOrganizationForUser } from "@/lib/queries/participants";
import { createClient } from "@/lib/supabase/server";
import { billSchema, transactionSchema } from "@/lib/validators/finance";

export type FinanceActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

const failure = (message: string): FinanceActionState => ({ ok: false, message });

function refreshFinancialRoutes() {
  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
  revalidatePath("/participantes");
}

export async function createBill(_: FinanceActionState, formData: FormData): Promise<FinanceActionState> {
  const parsed = billSchema.safeParse({ description: formData.get("description"), amount: formData.get("amount"), due_date: formData.get("due_date") });
  if (!parsed.success) return { ok: false, message: "Revise os campos destacados.", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const organization = await getCurrentOrganizationForUser();
    const supabase = await createClient();
    const { error } = await supabase.from("bills").insert({ ...parsed.data, organization_id: organization.id });
    if (error) return failure("Não foi possível cadastrar a conta.");
    revalidatePath("/financeiro");
    return { ok: true, message: "Conta cadastrada com sucesso." };
  } catch {
    return failure("Não foi possível cadastrar a conta.");
  }
}

export async function createManualTransaction(_: FinanceActionState, formData: FormData): Promise<FinanceActionState> {
  const parsed = transactionSchema.safeParse({ type: formData.get("type"), description: formData.get("description"), amount: formData.get("amount"), transaction_date: formData.get("transaction_date") });
  if (!parsed.success) return { ok: false, message: "Revise os campos destacados.", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const organization = await getCurrentOrganizationForUser();
    const supabase = await createClient();
    const { error } = await supabase.from("transactions").insert({ ...parsed.data, organization_id: organization.id, category: "Movimentação manual" });
    if (error) return failure("Não foi possível salvar a movimentação.");
    refreshFinancialRoutes();
    return { ok: true, message: "Movimentação cadastrada com sucesso." };
  } catch {
    return failure("Não foi possível salvar a movimentação.");
  }
}

export async function markFinanceFeePaid(_: FinanceActionState, formData: FormData): Promise<FinanceActionState> {
  const feeId = String(formData.get("fee_id") ?? "");
  if (!feeId) return failure("Mensalidade inválida.");
  try {
    const organization = await getCurrentOrganizationForUser();
    const supabase = await createClient();
    const { data: fee } = await supabase.from("monthly_fees").select("id,player_id").eq("id", feeId).eq("organization_id", organization.id).maybeSingle();
    if (!fee) return failure("Mensalidade não encontrada ou sem permissão.");
    const { data: player } = await supabase.from("players").select("id").eq("id", fee.player_id).eq("organization_id", organization.id).maybeSingle();
    if (!player) return failure("Participante da mensalidade não encontrado.");
    const { error } = await supabase.rpc("mark_fee_paid", { _fee: fee.id });
    if (error) return failure("Não foi possível marcar a mensalidade como paga.");
    refreshFinancialRoutes();
    revalidatePath(`/participantes/${fee.player_id}`);
    return { ok: true, message: "Mensalidade marcada como paga." };
  } catch {
    return failure("Não foi possível marcar a mensalidade como paga.");
  }
}

export async function markFinanceBillPaid(_: FinanceActionState, formData: FormData): Promise<FinanceActionState> {
  const billId = String(formData.get("bill_id") ?? "");
  if (!billId) return failure("Conta inválida.");
  try {
    const organization = await getCurrentOrganizationForUser();
    const supabase = await createClient();
    const { data: bill } = await supabase.from("bills").select("id").eq("id", billId).eq("organization_id", organization.id).maybeSingle();
    if (!bill) return failure("Conta não encontrada ou sem permissão.");
    const { error } = await supabase.rpc("mark_bill_paid", { _bill: bill.id });
    if (error) return failure("Não foi possível marcar a conta como paga.");
    refreshFinancialRoutes();
    return { ok: true, message: "Conta marcada como paga." };
  } catch {
    return failure("Não foi possível marcar a conta como paga.");
  }
}
