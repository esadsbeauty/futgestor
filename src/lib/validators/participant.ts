import { z } from "zod";

const optionalText = z.string().trim().transform((value) => value || null);

export const participantSchema = z.object({
  name: z.string().trim().min(2, "Informe um nome com pelo menos 2 caracteres.").max(120, "O nome é muito longo."),
  phone: optionalText.pipe(z.string().max(30, "O WhatsApp é muito longo.").nullable()),
  monthly_fee: z.coerce.number({ error: "Informe uma mensalidade válida." }).positive("A mensalidade deve ser maior que zero.").max(9999999999, "A mensalidade é muito alta."),
  due_day: z.coerce.number({ error: "Informe um dia válido." }).int("Use um dia inteiro.").min(1, "O dia mínimo é 1.").max(31, "O dia máximo é 31."),
  joined_at: z.iso.date({ error: "Informe uma data de entrada válida." }),
  status: z.enum(["active", "inactive"], { error: "Selecione um status válido." }),
  notes: optionalText.pipe(z.string().max(1000, "Use no máximo 1.000 caracteres.").nullable()),
});

export type ParticipantInput = z.infer<typeof participantSchema>;
