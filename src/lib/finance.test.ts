import { describe, expect, it } from "vitest";
import { effectiveFeeStatus, financialSummary, participantFinancialSummary, participantMonthStatus } from "./finance";

describe("effectiveFeeStatus", () => {
  const today = new Date("2026-10-05T12:00:00Z");
  it("keeps paid fees paid regardless of due date", () => expect(effectiveFeeStatus("paid", "2026-09-01", today)).toBe("paid"));
  it("marks an unpaid past fee overdue", () => expect(effectiveFeeStatus("pending", "2026-10-04", today)).toBe("overdue"));
  it("keeps today's and future fees pending", () => expect(effectiveFeeStatus("pending", "2026-10-05", today)).toBe("pending"));
});
describe("financialSummary", () => {
  it("calculates income, expenses and balance", () => expect(financialSummary([{ type: "income", amount: 50 }, { type: "expense", amount: 20 }, { type: "expense", amount: 10 }])).toEqual({ income: 50, expense: 30, balance: 20 }));
});

describe("participantMonthStatus", () => {
  const today = new Date("2026-10-05T12:00:00Z");
  it("prioritizes inactive player status", () => expect(participantMonthStatus("inactive", { status: "paid", due_date: "2026-10-01" }, today)).toBe("inactive"));
  it("uses the centralized fee rule for active players", () => expect(participantMonthStatus("active", { status: "pending", due_date: "2026-10-04" }, today)).toBe("overdue"));
});

describe("participantFinancialSummary", () => {
  it("sums paid, outstanding and overdue fees", () => expect(participantFinancialSummary([
    { status: "paid", amount: 50, due_date: "2026-08-10" },
    { status: "pending", amount: 55, due_date: "2026-09-10" },
    { status: "pending", amount: 55, due_date: "2026-11-10" },
  ], new Date("2026-10-05T12:00:00Z"))).toEqual({ totalPaid: 50, outstanding: 110, overdueCount: 1 }));
});
