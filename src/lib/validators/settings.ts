import { z } from "zod";
import { billingModeSchema } from "./billing";

export const organizationSettingsSchema = z.object({
  name: z.string().trim().min(2, "Informe um nome com pelo menos 2 caracteres.").max(120, "O nome da organização é muito longo."),
});

export const billingModeSettingsSchema = z.object({ billing_mode: billingModeSchema });

export const financialSettingsSchema = z.object({
  default_monthly_fee: z.coerce.number({ error: "Informe uma mensalidade válida." }).positive("A mensalidade deve ser maior que zero.").max(9999999999, "A mensalidade é muito alta."),
  default_due_day: z.coerce.number({ error: "Informe um dia válido." }).int("Use um dia inteiro.").min(1, "O dia mínimo é 1.").max(31, "O dia máximo é 31."),
});

export const profileSettingsSchema = z.object({
  name: z.string().trim().min(2, "Informe um nome com pelo menos 2 caracteres.").max(100, "O nome é muito longo."),
});

export const passwordSettingsSchema = z.object({
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres.").max(128, "A senha é muito longa."),
  passwordConfirmation: z.string(),
}).refine((data) => data.password === data.passwordConfirmation, { message: "As senhas precisam ser iguais.", path: ["passwordConfirmation"] });
