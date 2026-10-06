export type FeeStatus = "paid" | "pending" | "overdue";
export function effectiveFeeStatus(status: string, dueDate: string, today = new Date()): FeeStatus {
  if (status === "paid") return "paid";
  const current = today.toISOString().slice(0, 10);
  return dueDate < current ? "overdue" : "pending";
}

export function participantMonthStatus(
  playerStatus: "active" | "inactive",
  fee: { status: string; due_date: string } | null,
  today = new Date(),
): FeeStatus | "inactive" {
  if (playerStatus === "inactive") return "inactive";
  return fee ? effectiveFeeStatus(fee.status, fee.due_date, today) : "pending";
}

export function participantFinancialSummary(
  fees: Array<{ status: string; amount: number; due_date: string }>,
  today = new Date(),
) {
  return fees.reduce(
    (summary, fee) => {
      if (fee.status === "paid") summary.totalPaid += fee.amount;
      else {
        summary.outstanding += fee.amount;
        if (effectiveFeeStatus(fee.status, fee.due_date, today) === "overdue") summary.overdueCount += 1;
      }
      return summary;
    },
    { totalPaid: 0, outstanding: 0, overdueCount: 0 },
  );
}
export function financialSummary(transactions: Array<{ type: "income" | "expense"; amount: number }>) {
  const income = transactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const expense = transactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
  return { income, expense, balance: income - expense };
}
