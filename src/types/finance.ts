import type { FeeStatus } from "@/lib/finance";
import type { MonthlyFee } from "@/types/participants";

export type Bill = {
  id: string;
  organization_id: string;
  description: string;
  amount: number;
  due_date: string;
  status: "pending" | "paid";
  paid_at: string | null;
  transaction_id: string | null;
  created_at: string;
};

export type Transaction = {
  id: string;
  organization_id: string;
  player_id: string | null;
  monthly_fee_id: string | null;
  type: "income" | "expense";
  category: string;
  description: string | null;
  amount: number;
  transaction_date: string;
  created_at: string;
};

export type FeeWithPlayer = MonthlyFee & {
  playerName: string;
  effectiveStatus: FeeStatus;
};

export type BillWithStatus = Bill & { effectiveStatus: FeeStatus };
export type TransactionOrigin = "Mensalidade" | "Conta" | "Jogo" | "Manual";
export type TransactionWithOrigin = Transaction & { origin: TransactionOrigin };

export type FinancialOverview = {
  currentBalance: number;
  expectedFees: number;
  receivedFees: number;
  openFees: number;
  monthIncome: number;
  monthExpenses: number;
  monthResult: number;
};
