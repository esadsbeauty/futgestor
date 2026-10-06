import { describe, expect, it } from "vitest";
import { participantSchema } from "./participant";

const validParticipant = { name: "João Silva", phone: "71999999999", monthly_fee: "50", due_day: "10", joined_at: "2026-10-05", status: "active", billing_type: "monthly", notes: "" };

describe("participantSchema", () => {
  it("normalizes valid form values", () => expect(participantSchema.parse(validParticipant)).toEqual({ ...validParticipant, monthly_fee: 50, due_day: 10, notes: null }));
  it.each([
    ["short name", { ...validParticipant, name: "J" }],
    ["zero monthly fee", { ...validParticipant, monthly_fee: "0" }],
    ["invalid due day", { ...validParticipant, due_day: "32" }],
    ["invalid status", { ...validParticipant, status: "deleted" }],
  ])("rejects %s", (_, input) => expect(participantSchema.safeParse(input).success).toBe(false));
});
