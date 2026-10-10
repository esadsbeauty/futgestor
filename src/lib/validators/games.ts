import { z } from "zod";

export const gameSchema = z.object({
  title: z.string().trim().min(2, "Informe o título."),
  game_date: z.iso.date(),
  start_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .or(z.literal("")),
  location: z
    .string()
    .trim()
    .max(160)
    .transform((value) => value || null),
  player_price: z.coerce.number().positive("O valor deve ser maior que zero."),
  notes: z
    .string()
    .trim()
    .max(1000)
    .transform((value) => value || null),
  status: z.enum(["scheduled", "completed", "canceled"]),
  game_format: z.enum(["court", "field"]).default("court"),
});

export const gameExpenseSchema = z.object({
  description: z.string().trim().min(2, "Informe a descrição."),
  category: z.enum(["rental", "referee", "water", "other"]),
  amount: z.coerce.number().positive("O valor deve ser maior que zero."),
});

export const gamePlayersSchema = z.object({
  player_ids: z.array(z.uuid()).min(1, "Selecione ao menos um jogador."),
});

export const gameEventSchema = z.object({
  player_id: z.string().uuid("Participante inválido."),
  event_type: z.enum(["goal", "yellow_card", "red_card"]),
  quantity: z.coerce.number().int().min(1).max(20),
});

export const publicGameConfirmationSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome.").max(100),
  position: z.enum([
    "goalkeeper",
    "fixed",
    "winger",
    "pivot",
    "full_back",
    "center_back",
    "defensive_mid",
    "midfielder",
    "striker",
    "other",
  ]),
});
