import { effectiveBillStatus, effectiveFeeStatus, monthlyFinancialOverview } from "@/lib/finance";
import { createClient } from "@/lib/supabase/server";
import type { Bill, BillWithStatus, FeeWithPlayer, FinancialOverview, Transaction, TransactionWithOrigin } from "@/types/finance";
import type { MonthlyFee } from "@/types/participants";

export function monthBounds(referenceMonth: string) {
  const [year, month] = referenceMonth.split("-").map(Number);
  if (!year || month < 1 || month > 12) throw new Error("Mês de referência inválido.");
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const next = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
  return { start, next };
}

export async function getMonthlyFees(organizationId: string, referenceMonth: string): Promise<FeeWithPlayer[]> {
  const supabase = await createClient();
  const [{ data: fees, error: feeError }, { data: players, error: playerError }] = await Promise.all([
    supabase.from("monthly_fees").select("*").eq("organization_id", organizationId).eq("reference_month", referenceMonth).order("due_date"),
    supabase.from("players").select("id,name").eq("organization_id", organizationId),
  ]);
  if (feeError || playerError) throw new Error("Não foi possível carregar as mensalidades.");
  const names = new Map((players ?? []).map((player) => [player.id, player.name]));
  return ((fees ?? []) as MonthlyFee[]).map((fee) => ({ ...fee, playerName: names.get(fee.player_id) ?? "Participante", effectiveStatus: effectiveFeeStatus(fee.status, fee.due_date) }));
}

export async function getMonthlyBills(organizationId: string, referenceMonth: string): Promise<BillWithStatus[]> {
  const { start, next } = monthBounds(referenceMonth);
  const supabase = await createClient();
  const { data, error } = await supabase.from("bills").select("*").eq("organization_id", organizationId).gte("due_date", start).lt("due_date", next).order("due_date");
  if (error) throw new Error("Não foi possível carregar as contas.");
  return ((data ?? []) as Bill[]).map((bill) => ({ ...bill, effectiveStatus: effectiveBillStatus(bill.status, bill.due_date) }));
}

export async function getMonthlyTransactions(organizationId: string, referenceMonth: string): Promise<TransactionWithOrigin[]> {
  const { start, next } = monthBounds(referenceMonth);
  const supabase = await createClient();
  const { data, error } = await supabase.from("transactions").select("*").eq("organization_id", organizationId).gte("transaction_date", start).lt("transaction_date", next).order("transaction_date", { ascending: false }).order("created_at", { ascending: false });
  if (error) throw new Error("Não foi possível carregar as movimentações.");
  const transactions = (data ?? []) as Transaction[];
  const transactionIds = transactions.map((transaction) => transaction.id);
  let billTransactionIds = new Set<string>();
  if (transactionIds.length) {
    const { data: bills } = await supabase.from("bills").select("transaction_id").eq("organization_id", organizationId).in("transaction_id", transactionIds);
    billTransactionIds = new Set((bills ?? []).flatMap((bill) => bill.transaction_id ? [bill.transaction_id] : []));
  }
  return transactions.map((transaction) => ({
    ...transaction,
    origin: transaction.monthly_fee_id ? "Mensalidade" : billTransactionIds.has(transaction.id) ? "Conta" : transaction.category === "Jogo" ? "Jogo" : "Manual",
  }));
}

export async function getCurrentBalanceTransactions(organizationId: string): Promise<Transaction[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("transactions").select("id,organization_id,player_id,monthly_fee_id,type,category,description,amount,transaction_date,created_at").eq("organization_id", organizationId);
  if (error) throw new Error("Não foi possível calcular o caixa atual.");
  return (data ?? []) as Transaction[];
}

export function getFinancialOverview(allTransactions: Transaction[], monthTransactions: Transaction[], monthFees: MonthlyFee[]): FinancialOverview {
  return monthlyFinancialOverview(allTransactions, monthTransactions, monthFees);
}
