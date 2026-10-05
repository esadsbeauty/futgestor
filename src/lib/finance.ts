export type FeeStatus = "paid" | "pending" | "overdue";
export function effectiveFeeStatus(status: string, dueDate: string, today = new Date()): FeeStatus {
  if (status === "paid") return "paid";
  const current = today.toISOString().slice(0, 10);
  return dueDate < current ? "overdue" : "pending";
}
export function financialSummary(transactions: Array<{ type: "income" | "expense"; amount: number }>) {
  const income = transactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const expense = transactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
  return { income, expense, balance: income - expense };
}
