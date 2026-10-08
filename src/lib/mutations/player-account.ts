"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export type PlayerAccountActionState = {
  ok: boolean;
  message?: string;
  status?: "confirmed" | "declined";
};

const attendanceSchema = z.object({
  game_id: z.string().uuid(),
  status: z.enum(["confirmed", "declined"]),
});

export async function respondMyGameAttendance(
  _: PlayerAccountActionState,
  formData: FormData
): Promise<PlayerAccountActionState> {
  const parsed = attendanceSchema.safeParse({
    game_id: formData.get("game_id"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return { ok: false, message: "Não foi possível registrar sua resposta." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("respond_my_game_attendance", {
    _game_id: parsed.data.game_id,
    _status: parsed.data.status,
  });

  if (error || !data) {
    return { ok: false, message: "Não foi possível atualizar sua presença." };
  }

  revalidatePath("/meu-grupo");

  return {
    ok: true,
    status: parsed.data.status,
    message:
      parsed.data.status === "confirmed"
        ? "Presença confirmada."
        : "Resposta atualizada.",
  };
}

export async function logoutPlayer() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
