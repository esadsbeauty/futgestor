import { z } from "zod";
import { playerBillingTypeSchema } from "./billing";

export const createPlayerInviteSchema = z.object({
  billing_type: playerBillingTypeSchema.nullable(),
  expires_at: z
    .union([
      z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
      z.literal(""),
      z.null(),
    ])
    .transform((value) => (value ? new Date(value).toISOString() : null)),
  max_uses: z
    .union([z.coerce.number().int().positive(), z.literal(""), z.null()])
    .transform((value) => (value === "" ? null : value)),
});

export const acceptPlayerInviteSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome."),
  whatsapp: z
    .string()
    .transform((value) => value.replace(/\D/g, ""))
    .refine(
      (value) => value.length >= 10 && value.length <= 13,
      "Informe um WhatsApp válido."
    ),
});

export const acceptPlayerInviteWithAccountSchema = acceptPlayerInviteSchema.extend({
  email: z.string().trim().email("Informe um e-mail válido."),
  password: z
    .string()
    .min(8, "A senha deve ter pelo menos 8 caracteres.")
    .max(128, "A senha é muito longa."),
});
