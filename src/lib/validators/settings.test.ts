import { describe, expect, it } from "vitest";
import { billingModeSettingsSchema, financialSettingsSchema, financialTransparencySettingsSchema, organizationSettingsSchema, passwordSettingsSchema, profileSettingsSchema } from "./settings";

describe("organizationSettingsSchema", () => {
  it("trims and accepts a valid name", () => expect(organizationSettingsSchema.parse({ name: "  Baba dos Amigos  " })).toEqual({ name: "Baba dos Amigos" }));
  it.each(["", "A", "x".repeat(121)])("rejects invalid organization name", (name) => expect(organizationSettingsSchema.safeParse({ name }).success).toBe(false));
});

describe("financialSettingsSchema", () => {
  it("coerces valid defaults", () => expect(financialSettingsSchema.parse({ default_monthly_fee: "50", default_due_day: "10" })).toEqual({ default_monthly_fee: 50, default_due_day: 10 }));
  it.each([{ default_monthly_fee: 0, default_due_day: 10 }, { default_monthly_fee: -1, default_due_day: 10 }, { default_monthly_fee: 50, default_due_day: 0 }, { default_monthly_fee: 50, default_due_day: 32 }, { default_monthly_fee: 50, default_due_day: 10.5 }])("rejects invalid financial defaults %#", (input) => expect(financialSettingsSchema.safeParse(input).success).toBe(false));
});

describe("billingModeSettingsSchema", () => {
  it.each(["monthly", "per_game", "hybrid"])("accepts %s", (billing_mode) => expect(billingModeSettingsSchema.safeParse({ billing_mode }).success).toBe(true));
  it("rejects an unknown mode", () => expect(billingModeSettingsSchema.safeParse({ billing_mode: "weekly" }).success).toBe(false));
});

describe("profileSettingsSchema", () => {
  it("accepts a valid profile name", () => expect(profileSettingsSchema.parse({ name: "João Silva" })).toEqual({ name: "João Silva" }));
  it.each(["", "J", "x".repeat(101)])("rejects invalid profile name", (name) => expect(profileSettingsSchema.safeParse({ name }).success).toBe(false));
});

describe("passwordSettingsSchema", () => {
  it("accepts matching passwords with at least eight characters", () => expect(passwordSettingsSchema.safeParse({ password: "segura123", passwordConfirmation: "segura123" }).success).toBe(true));
  it("rejects a short password", () => expect(passwordSettingsSchema.safeParse({ password: "1234567", passwordConfirmation: "1234567" }).success).toBe(false));
  it("rejects different confirmation", () => expect(passwordSettingsSchema.safeParse({ password: "segura123", passwordConfirmation: "outrasenha" }).success).toBe(false));
});


describe("financialTransparencySettingsSchema", () => {
  it("maps checked fields to booleans", () => expect(financialTransparencySettingsSchema.parse({ show_cash_balance: "on", show_receivables: null, show_payables: "on", show_pending_players: "on", show_individual_values: undefined })).toEqual({ show_cash_balance: true, show_receivables: false, show_payables: true, show_pending_players: true, show_individual_values: false }));
});
