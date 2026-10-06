import type { FeeStatus } from "@/lib/finance";

export type PlayerState = "active" | "inactive";

export type Organization = {
  id: string;
  name: string;
  default_monthly_fee: number;
  default_due_day: number;
};

export type Participant = {
  id: string;
  organization_id: string;
  name: string;
  phone: string | null;
  monthly_fee: number;
  due_day: number;
  joined_at: string;
  status: PlayerState;
  notes: string | null;
  created_at: string;
};

export type MonthlyFee = {
  id: string;
  organization_id: string;
  player_id: string;
  reference_month: string;
  amount: number;
  due_date: string;
  status: "pending" | "paid";
  paid_at: string | null;
  created_at: string;
};

export type ParticipantWithCurrentFee = Participant & {
  currentFee: MonthlyFee | null;
  financialStatus: FeeStatus | "inactive";
};

export type ParticipantFinancialSummary = {
  totalPaid: number;
  outstanding: number;
  overdueCount: number;
};
