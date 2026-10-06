import { z } from "zod";

export const billingModeSchema = z.enum(["monthly", "per_game", "hybrid"], { error: "Selecione um modelo de cobrança válido." });
export const playerBillingTypeSchema = z.enum(["monthly", "per_game"], { error: "Selecione um tipo de cobrança válido." });
