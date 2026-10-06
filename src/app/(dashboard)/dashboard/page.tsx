import { AttentionFeesList } from "@/components/futgestor/attention-fees-list";
import { DashboardEmptyState } from "@/components/futgestor/dashboard-empty-state";
import { DashboardHeader } from "@/components/futgestor/dashboard-header";
import { DashboardSummaryCards } from "@/components/futgestor/dashboard-summary-cards";
import { MonthlyFeeProgress } from "@/components/futgestor/monthly-fee-progress";
import { MonthlyInsight } from "@/components/futgestor/monthly-insight";
import { RecentTransactions } from "@/components/futgestor/recent-transactions";
import { UpcomingBillsList } from "@/components/futgestor/upcoming-bills-list";
import { monthlyInsight, prioritizeAttentionFees, summarizeDashboardFees } from "@/lib/dashboard";
import { getDashboardSnapshot } from "@/lib/queries/dashboard";
import { currentReferenceMonth, ensureCurrentMonthFees, getCurrentOrganizationForUser } from "@/lib/queries/participants";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const organization = await getCurrentOrganizationForUser();
  const referenceMonth = currentReferenceMonth();
  await ensureCurrentMonthFees(organization.id, referenceMonth);
  const snapshot = await getDashboardSnapshot(organization.id, referenceMonth);
  const feeSummary = summarizeDashboardFees(snapshot.fees);
  const attentionFees = prioritizeAttentionFees(snapshot.fees);
  const insight = monthlyInsight(feeSummary, snapshot.overview.openFees);
  const financeHref = `/financeiro?mes=${referenceMonth.slice(0, 7)}`;

  return <div className="mx-auto max-w-5xl pb-8">
    <DashboardHeader organizationName={organization.name} profileName={snapshot.profileName} referenceMonth={referenceMonth}/>
    {snapshot.participantCount === 0 ? <DashboardEmptyState/> : <>
      <DashboardSummaryCards overview={snapshot.overview} activeParticipants={snapshot.activeParticipantCount} overdueFees={feeSummary.overdue}/>
      <MonthlyFeeProgress summary={feeSummary}/>
      <MonthlyInsight message={insight} positive={feeSummary.total > 0 && feeSummary.overdue === 0 && snapshot.overview.openFees === 0}/>
      <div className="mt-10 grid gap-10 lg:grid-cols-2 lg:gap-5">
        <AttentionFeesList fees={attentionFees} financeHref={financeHref}/>
        <UpcomingBillsList bills={snapshot.upcomingBills}/>
      </div>
      <RecentTransactions transactions={snapshot.recentTransactions}/>
    </>}
  </div>;
}
