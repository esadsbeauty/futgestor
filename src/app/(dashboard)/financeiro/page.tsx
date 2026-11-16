import { BillsList } from "@/components/futgestor/bills-list";
import { FinanceSummaryCards } from "@/components/futgestor/finance-summary-cards";
import { MonthSelector } from "@/components/futgestor/month-selector";
import { MonthlyFeesList } from "@/components/futgestor/monthly-fees-list";
import { TransactionsList } from "@/components/futgestor/transactions-list";
import { BillingModeNotice } from "@/components/futgestor/billing-mode-notice";
import { GameFinanceOverview } from "@/components/futgestor/game-finance-overview";
import { usesMonthlyBilling } from "@/lib/billing";
import { getCurrentBalanceTransactions, getFinancialOverview, getMonthlyBills, getMonthlyFees, getMonthlyGameFinancialOverview, getMonthlyTransactions } from "@/lib/queries/finance";
import { currentReferenceMonth, ensureCurrentMonthFees, getCurrentOrganizationForUser } from "@/lib/queries/participants";
import { bahiaDateString } from "@/lib/timezone";

export const dynamic = "force-dynamic";

export default async function FinancePage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const requestedMonth = (await searchParams).mes;
  const currentMonth = currentReferenceMonth().slice(0, 7);
  const selectedMonth = requestedMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonth) ? requestedMonth : currentMonth;
  const referenceMonth = `${selectedMonth}-01`;
  const organization = await getCurrentOrganizationForUser();
  if (usesMonthlyBilling(organization.billing_mode)) await ensureCurrentMonthFees(organization.id, referenceMonth);
  const [fees, bills, transactions, allTransactions, gameOverview] = await Promise.all([
    getMonthlyFees(organization.id, referenceMonth),
    getMonthlyBills(organization.id, referenceMonth),
    getMonthlyTransactions(organization.id, referenceMonth),
    getCurrentBalanceTransactions(organization.id),
    getMonthlyGameFinancialOverview(organization.id, referenceMonth),
  ]);

  const overview = getFinancialOverview(allTransactions, transactions, fees);
  const displayOverview = {
    ...overview,
    expectedFees: overview.expectedFees + gameOverview.expected,
    receivedFees: overview.receivedFees + gameOverview.received,
    openFees: overview.openFees + gameOverview.open,
  };
  const today = bahiaDateString();
  const defaultDate = selectedMonth === currentMonth ? today : referenceMonth;

  return <div className="mx-auto max-w-5xl pb-8">
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[var(--brand)]">Controle do caixa</p><h1 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-4xl">Financeiro</h1><p className="mt-2 max-w-xl text-sm text-[var(--muted)]">Acompanhe entradas, saídas e mensalidades do seu baba.</p></div><MonthSelector month={selectedMonth}/></header>
    <section className="card mt-6 p-5 sm:p-6" aria-label="Mercado Pago Pix">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[var(--brand)]">Nova forma de cobrança</p>
          <h2 className="mt-2 text-lg font-black">Pix pelo Mercado Pago</h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">Integração em preparação. As configurações de teste foram copiadas da Casa Reserva do Forte, mas ainda falta vincular as credenciais de cobrança e configurar a confirmação automática de pagamento neste projeto.</p>
        </div>
        <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-300">Não habilitado</span>
      </div>
      <p className="mt-3 text-xs text-[var(--muted)]">Por segurança, nenhum Pix será gerado nem marcado como pago até a integração ser concluída e validada.</p>
    </section>
    <FinanceSummaryCards overview={displayOverview}/>
    <GameFinanceOverview overview={gameOverview}/>
    {organization.billing_mode === "per_game" ? <BillingModeNotice compact/> : <MonthlyFeesList fees={fees}/>}
    <BillsList bills={bills} defaultDate={defaultDate}/>
    <TransactionsList transactions={transactions} defaultDate={defaultDate}/>
  </div>;
}
