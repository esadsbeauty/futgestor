import { z } from "zod";

export const loginSchema = z.object({ email: z.email(), password: z.string().min(8) });
export const signupSchema = loginSchema.extend({
  name: z.string().trim().min(2).max(100),
  organization_name: z.string().trim().min(2).max(120),
  default_monthly_fee: z.coerce.number().nonnegative().max(9999999999),
  default_due_day: z.coerce.number().int().min(1).max(31),
});
