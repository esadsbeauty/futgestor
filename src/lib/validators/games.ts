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
  player_id: z.string().uuid("Participante inválido.").nullish(),
  guest_confirmation_id: z.string().uuid("Jogador inválido.").nullish(),
  event_type: z.enum(["goal", "yellow_card", "red_card"]),
  quantity: z.coerce.number().int().min(1).max(20),
}).refine((data) => Boolean(data.player_id) !== Boolean(data.guest_confirmation_id), {
  message: "Selecione um participante ou jogador do jogo.",
  path: ["player_id"],
});

export const publicGameConfirmationSchema = z
  .object({
    name: z.string().trim().min(2, "Informe seu nome.").max(100),
    attendance_status: z.enum(["confirmed", "declined"]),
    sport_type: z.enum(["futsal", "football"]).nullable(),
    position: z
      .enum([
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
      ])
      .nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.attendance_status === "declined") return;

    if (!data.sport_type) {
      ctx.addIssue({
        code: "custom",
        path: ["sport_type"],
        message: "Escolha o tipo de jogo.",
      });
      return;
    }

    if (!data.position) {
      ctx.addIssue({
        code: "custom",
        path: ["position"],
        message: "Escolha sua posição.",
      });
      return;
    }

    const futsalPositions = ["goalkeeper", "fixed", "winger", "pivot", "other"];
    const footballPositions = [
      "goalkeeper",
      "full_back",
      "center_back",
      "defensive_mid",
      "midfielder",
      "winger",
      "striker",
      "other",
    ];

    const allowed =
      data.sport_type === "futsal" ? futsalPositions : footballPositions;

    if (!allowed.includes(data.position)) {
      ctx.addIssue({
        code: "custom",
        path: ["position"],
        message: "Posição inválida para o tipo de jogo escolhido.",
      });
    }
  });
