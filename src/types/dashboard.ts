import type { BillWithStatus, FeeWithPlayer, FinancialOverview, TransactionWithOrigin } from "@/types/finance";

export type DashboardFeeSummary = {
  total: number;
  paid: number;
  pending: number;
  overdue: number;
  paidPercentage: number;
};

export type GoalRankingEntry = {
  playerId: string;
  playerName: string;
  goals: number;
};

export type DashboardSnapshot = {
  profileName: string | null;
  participantCount: number;
  activeParticipantCount: number;
  overview: FinancialOverview;
  fees: FeeWithPlayer[];
  upcomingBills: BillWithStatus[];
  recentTransactions: TransactionWithOrigin[];
  goalRanking: GoalRankingEntry[];
};
