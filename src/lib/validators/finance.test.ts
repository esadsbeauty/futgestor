import { describe, expect, it } from "vitest";
import { billSchema, transactionSchema } from "./finance";

describe("billSchema", () => {
  it("normalizes a valid bill", () => expect(billSchema.parse({ description: "Aluguel do campo", amount: "120.50", due_date: "2026-10-10" })).toEqual({ description: "Aluguel do campo", amount: 120.5, due_date: "2026-10-10" }));
  it.each([{ description: "", amount: 10, due_date: "2026-10-10" }, { description: "Água", amount: 0, due_date: "2026-10-10" }, { description: "Água", amount: 10, due_date: "10/10/2026" }])("rejects invalid bill %#", (input) => expect(billSchema.safeParse(input).success).toBe(false));
});

describe("transactionSchema", () => {
  it.each(["income", "expense"])("accepts a positive %s", (type) => expect(transactionSchema.safeParse({ type, description: "Ajuste de caixa", amount: 25, transaction_date: "2026-10-05" }).success).toBe(true));
  it.each([{ type: "transfer", description: "Ajuste", amount: 10, transaction_date: "2026-10-05" }, { type: "income", description: "", amount: 10, transaction_date: "2026-10-05" }, { type: "expense", description: "Ajuste", amount: -1, transaction_date: "2026-10-05" }])("rejects invalid movement %#", (input) => expect(transactionSchema.safeParse(input).success).toBe(false));
});
