import { effectiveBillStatus } from "@/lib/finance";
import { getCurrentBalanceTransactions, getFinancialOverview, getMonthlyFees, getMonthlyTransactions } from "@/lib/queries/finance";
import { createClient } from "@/lib/supabase/server";
import type { DashboardSnapshot } from "@/types/dashboard";
import type { Bill, BillWithStatus, Transaction, TransactionWithOrigin } from "@/types/finance";

async function getDashboardContext(organizationId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão inválida.");
  const [profileResult, participantResult, activeResult, billsResult, recentResult] = await Promise.all([
    supabase.from("profiles").select("name").eq("id", user.id).maybeSingle(),
    supabase.from("players").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    supabase.from("players").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "active"),
    supabase.from("bills").select("*").eq("organization_id", organizationId).eq("status", "pending").order("due_date").limit(5),
    supabase.from("transactions").select("*").eq("organization_id", organizationId).order("transaction_date", { ascending: false }).order("created_at", { ascending: false }).limit(6),
  ]);
  if (profileResult.error || participantResult.error || activeResult.error || billsResult.error || recentResult.error) throw new Error("Não foi possível carregar o resumo do dashboard.");

  const transactions = (recentResult.data ?? []) as Transaction[];
  const transactionIds = transactions.map((transaction) => transaction.id);
  let billTransactionIds = new Set<string>();
  if (transactionIds.length) {
    const { data: linkedBills, error: linkedBillsError } = await supabase.from("bills").select("transaction_id").eq("organization_id", organizationId).in("transaction_id", transactionIds);
    if (linkedBillsError) throw new Error("Não foi possível identificar a origem das movimentações.");
    billTransactionIds = new Set((linkedBills ?? []).flatMap((bill) => bill.transaction_id ? [bill.transaction_id] : []));
  }
  const recentTransactions: TransactionWithOrigin[] = transactions.map((transaction) => ({
    ...transaction,
    origin: transaction.monthly_fee_id ? "Mensalidade" : billTransactionIds.has(transaction.id) ? "Conta" : transaction.category === "Jogo" ? "Jogo" : "Manual",
  }));
  const upcomingBills: BillWithStatus[] = ((billsResult.data ?? []) as Bill[]).map((bill) => ({ ...bill, effectiveStatus: effectiveBillStatus(bill.status, bill.due_date) }));
  return { profileName: profileResult.data?.name ?? null, participantCount: participantResult.count ?? 0, activeParticipantCount: activeResult.count ?? 0, upcomingBills, recentTransactions };
}

export async function getDashboardSnapshot(organizationId: string, referenceMonth: string): Promise<DashboardSnapshot> {
  const [context, fees, monthTransactions, allTransactions] = await Promise.all([
    getDashboardContext(organizationId),
    getMonthlyFees(organizationId, referenceMonth),
    getMonthlyTransactions(organizationId, referenceMonth),
    getCurrentBalanceTransactions(organizationId),
  ]);
  return { ...context, fees, overview: getFinancialOverview(allTransactions, monthTransactions, fees) };
}
