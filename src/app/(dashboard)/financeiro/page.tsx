import { BillsList } from "@/components/futgestor/bills-list";
import { FinanceSummaryCards } from "@/components/futgestor/finance-summary-cards";
import { MonthSelector } from "@/components/futgestor/month-selector";
import { MonthlyFeesList } from "@/components/futgestor/monthly-fees-list";
import { TransactionsList } from "@/components/futgestor/transactions-list";
import { BillingModeNotice } from "@/components/futgestor/billing-mode-notice";
import { usesMonthlyBilling } from "@/lib/billing";
import { getCurrentBalanceTransactions, getFinancialOverview, getMonthlyBills, getMonthlyFees, getMonthlyTransactions } from "@/lib/queries/finance";
import { currentReferenceMonth, ensureCurrentMonthFees, getCurrentOrganizationForUser } from "@/lib/queries/participants";

export const dynamic = "force-dynamic";

export default async function FinancePage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const requestedMonth = (await searchParams).mes;
  const currentMonth = currentReferenceMonth().slice(0, 7);
  const selectedMonth = requestedMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonth) ? requestedMonth : currentMonth;
  const referenceMonth = `${selectedMonth}-01`;
  const organization = await getCurrentOrganizationForUser();
  if (usesMonthlyBilling(organization.billing_mode)) await ensureCurrentMonthFees(organization.id, referenceMonth);
  const [fees, bills, transactions, allTransactions] = await Promise.all([
    getMonthlyFees(organization.id, referenceMonth),
    getMonthlyBills(organization.id, referenceMonth),
    getMonthlyTransactions(organization.id, referenceMonth),
    getCurrentBalanceTransactions(organization.id),
  ]);
  const overview = getFinancialOverview(allTransactions, transactions, fees);
  const displayOverview = organization.billing_mode === "per_game" ? { ...overview, expectedFees: 0, receivedFees: 0, openFees: 0 } : overview;
  const today = new Date().toISOString().slice(0, 10);
  const defaultDate = selectedMonth === currentMonth ? today : referenceMonth;

  return <div className="mx-auto max-w-5xl pb-8">
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Financeiro</h1><p className="mt-2 max-w-xl text-sm text-[var(--muted)]">Acompanhe entradas, saídas e mensalidades do seu baba.</p></div><MonthSelector month={selectedMonth}/></header>
    <FinanceSummaryCards overview={displayOverview}/>
    {organization.billing_mode === "per_game" ? <BillingModeNotice/> : <MonthlyFeesList fees={fees}/>}
    <BillsList bills={bills} defaultDate={defaultDate}/>
    <TransactionsList transactions={transactions} defaultDate={defaultDate}/>
  </div>;
}
