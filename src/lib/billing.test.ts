import { describe, expect, it } from "vitest";
import { effectivePlayerBillingType, shouldGenerateMonthlyFee, usesMonthlyBilling } from "./billing";
import { billingModeSchema, playerBillingTypeSchema } from "./validators/billing";

describe("billing validators", () => {
  it.each(["monthly", "per_game", "hybrid"])("accepts billing mode %s", (mode) => expect(billingModeSchema.safeParse(mode).success).toBe(true));
  it.each(["", "weekly", "game"])("rejects billing mode %s", (mode) => expect(billingModeSchema.safeParse(mode).success).toBe(false));
  it.each(["monthly", "per_game"])("accepts player billing type %s", (type) => expect(playerBillingTypeSchema.safeParse(type).success).toBe(true));
  it("rejects an invalid player billing type", () => expect(playerBillingTypeSchema.safeParse("hybrid").success).toBe(false));
});

describe("monthly fee applicability", () => {
  it("applies to active billing in monthly organizations", () => expect(shouldGenerateMonthlyFee("monthly", "per_game")).toBe(true));
  it("never applies in per-game organizations", () => expect(shouldGenerateMonthlyFee("per_game", "monthly")).toBe(false));
  it("applies only to monthly players in hybrid organizations", () => {
    expect(shouldGenerateMonthlyFee("hybrid", "monthly")).toBe(true);
    expect(shouldGenerateMonthlyFee("hybrid", "per_game")).toBe(false);
  });
  it("identifies modes that use monthly fees", () => {
    expect(usesMonthlyBilling("monthly")).toBe(true);
    expect(usesMonthlyBilling("hybrid")).toBe(true);
    expect(usesMonthlyBilling("per_game")).toBe(false);
  });
});

describe("effectivePlayerBillingType", () => {
  it("forces monthly for monthly organizations", () => expect(effectivePlayerBillingType("monthly", "per_game")).toBe("monthly"));
  it("forces per-game for per-game organizations", () => expect(effectivePlayerBillingType("per_game", "monthly")).toBe("per_game"));
  it("keeps the selected type for hybrid organizations", () => {
    expect(effectivePlayerBillingType("hybrid", "monthly")).toBe("monthly");
    expect(effectivePlayerBillingType("hybrid", "per_game")).toBe("per_game");
  });
});
