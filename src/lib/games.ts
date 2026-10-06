import type { GameCharge, GameExpense } from "@/types/games";

export function gameFinancialSummary(charges: Pick<GameCharge,"amount"|"status">[], expenses: Pick<GameExpense,"amount"|"status">[]) {
  const expected=charges.reduce((s,x)=>s+x.amount,0);
  const received=charges.filter(x=>x.status==="paid").reduce((s,x)=>s+x.amount,0);
  const totalExpenses=expenses.reduce((s,x)=>s+x.amount,0);
  const paidExpenses=expenses.filter(x=>x.status==="paid").reduce((s,x)=>s+x.amount,0);
  return { expected,received,open:expected-received,totalExpenses,paidExpenses,receivedResult:received-paidExpenses,expectedResult:expected-totalExpenses };
}
