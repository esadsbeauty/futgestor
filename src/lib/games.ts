import type { GameCharge, GameExpense } from "@/types/games";

export function gameFinancialSummary(
  charges: Pick<GameCharge, "amount" | "status">[],
  expenses: Pick<GameExpense, "amount" | "status">[],
  publicConfirmedExpected = 0
) {
  const chargedExpected = charges.reduce((sum, item) => sum + item.amount, 0);
  const expected = chargedExpected + publicConfirmedExpected;
  const received = charges
    .filter((item) => item.status === "paid")
    .reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
  const paidExpenses = expenses
    .filter((item) => item.status === "paid")
    .reduce((sum, item) => sum + item.amount, 0);

  return {
    expected,
    received,
    open: expected - received,
    totalExpenses,
    paidExpenses,
    receivedResult: received - paidExpenses,
    expectedResult: expected - totalExpenses,
  };
}
