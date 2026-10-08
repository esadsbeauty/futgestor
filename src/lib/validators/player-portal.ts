import { z } from "zod";

export const portalTokenSchema = z
  .string()
  .trim()
  .min(50, "Link de acesso inválido.")
  .max(160, "Link de acesso inválido.");

export const playerAccessMutationSchema = z.object({
  player_id: z.string().uuid("Participante inválido."),
});

export const gameAttendanceResponseSchema = z.object({
  token: portalTokenSchema,
  game_id: z.string().uuid("Jogo inválido."),
  status: z.enum(["confirmed", "declined"]),
});