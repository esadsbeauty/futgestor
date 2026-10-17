import type { FeeStatus } from "@/lib/finance";
import type { BillingMode, PlayerBillingType } from "@/types/billing";

export type PlayerState = "active" | "inactive";

export type Organization = {
  id: string;
  name: string;
  default_monthly_fee: number;
  default_due_day: number;
  billing_mode: BillingMode;
  show_cash_balance: boolean;
  show_receivables: boolean;
  show_payables: boolean;
  show_pending_players: boolean;
  show_individual_values: boolean;
};

export type Participant = {
  id: string;
  organization_id: string;
  user_id: string | null;
  name: string;
  phone: string | null;
  monthly_fee: number;
  due_day: number;
  joined_at: string;
  status: PlayerState;
  billing_type: PlayerBillingType;
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
  financialStatus: FeeStatus | "inactive" | "per_game";
};

export type ParticipantFinancialSummary = {
  totalPaid: number;
  outstanding: number;
  overdueCount: number;
};
