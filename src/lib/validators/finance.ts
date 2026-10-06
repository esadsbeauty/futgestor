import { z } from "zod";

export const billSchema = z.object({
  description: z.string().trim().min(2, "Informe uma descrição.").max(160, "A descrição é muito longa."),
  amount: z.coerce.number({ error: "Informe um valor válido." }).positive("O valor deve ser maior que zero.").max(9999999999, "O valor é muito alto."),
  due_date: z.iso.date({ error: "Informe uma data de vencimento válida." }),
});

export const transactionSchema = z.object({
  type: z.enum(["income", "expense"], { error: "Selecione o tipo da movimentação." }),
  description: z.string().trim().min(2, "Informe uma descrição.").max(160, "A descrição é muito longa."),
  amount: z.coerce.number({ error: "Informe um valor válido." }).positive("O valor deve ser maior que zero.").max(9999999999, "O valor é muito alto."),
  transaction_date: z.iso.date({ error: "Informe uma data válida." }),
});

export const referenceMonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-01$/);
