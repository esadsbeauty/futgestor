import type { BillingMode, PlayerBillingType } from "@/types/billing";

export function usesMonthlyBilling(mode: BillingMode) {
  return mode !== "per_game";
}

export function shouldGenerateMonthlyFee(mode: BillingMode, playerType: PlayerBillingType) {
  return mode === "monthly" || (mode === "hybrid" && playerType === "monthly");
}

export function effectivePlayerBillingType(mode: BillingMode, requested: PlayerBillingType): PlayerBillingType {
  if (mode === "monthly") return "monthly";
  if (mode === "per_game") return "per_game";
  return requested;
}
