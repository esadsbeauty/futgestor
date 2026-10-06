import { describe, expect, it } from "vitest";
import { monthlyInsight, paidFeePercentage, prioritizeAttentionFees, summarizeDashboardFees } from "./dashboard";

describe("paidFeePercentage", () => {
  it("returns a rounded percentage", () => expect(paidFeePercentage(5, 6)).toBe(83));
  it("returns zero when there are no fees", () => expect(paidFeePercentage(0, 0)).toBe(0));
});

describe("summarizeDashboardFees", () => {
  const fees = [
    { effectiveStatus: "paid" as const, due_date: "2026-10-05", amount: 50 },
    { effectiveStatus: "pending" as const, due_date: "2026-10-10", amount: 50 },
    { effectiveStatus: "overdue" as const, due_date: "2026-10-01", amount: 60 },
  ];
  it("counts each effective status", () => expect(summarizeDashboardFees(fees)).toEqual({ total: 3, paid: 1, pending: 1, overdue: 1, paidPercentage: 33 }));
});

describe("prioritizeAttentionFees", () => {
  it("places overdue fees before pending fees and sorts by due date", () => {
    const fees = [
      { id: "pending", effectiveStatus: "pending" as const, due_date: "2026-10-06", amount: 50 },
      { id: "overdue-later", effectiveStatus: "overdue" as const, due_date: "2026-10-03", amount: 50 },
      { id: "paid", effectiveStatus: "paid" as const, due_date: "2026-10-01", amount: 50 },
      { id: "overdue-first", effectiveStatus: "overdue" as const, due_date: "2026-10-02", amount: 50 },
    ];
    expect(prioritizeAttentionFees(fees).map((fee) => fee.id)).toEqual(["overdue-first", "overdue-later", "pending"]);
  });
});

describe("monthlyInsight", () => {
  it("prioritizes overdue fees", () => expect(monthlyInsight({ total: 3, paid: 1, pending: 1, overdue: 1, paidPercentage: 33 }, 100)).toBe("1 mensalidade atrasada precisa de atenção."));
  it("shows open amount when there are no overdue fees", () => expect(monthlyInsight({ total: 3, paid: 2, pending: 1, overdue: 0, paidPercentage: 67 }, 50)).toContain("R$ 50,00"));
  it("shows a positive message when all fees are paid", () => expect(monthlyInsight({ total: 2, paid: 2, pending: 0, overdue: 0, paidPercentage: 100 }, 0)).toBe("Todas as mensalidades do mês estão em dia."));
});
