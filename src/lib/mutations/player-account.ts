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


export type PlayerActivationActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

const activationSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido."),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres.").max(128),
});

export async function activateExistingPlayerAccount(
  _: PlayerActivationActionState,
  formData: FormData
): Promise<PlayerActivationActionState> {
  const token = String(formData.get("token") ?? "");
  const origin = String(formData.get("origin") ?? "");

  const parsed = activationSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Revise os campos.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/meu-grupo`,
      data: {
        account_type: "player",
        player_access_token: token,
      },
    },
  });

  if (error) {
    const message = error.message.toLowerCase();

    if (
      message.includes("already") ||
      message.includes("registered") ||
      message.includes("exists")
    ) {
      return {
        ok: false,
        message:
          "Este e-mail já possui uma conta. Entre com sua senha ou recupere o acesso.",
      };
    }

    return {
      ok: false,
      message: "Não foi possível criar sua conta. Solicite um novo link.",
    };
  }

  return {
    ok: true,
    message: data.session
      ? "Conta ativada. Você já pode acessar seu grupo."
      : "Conta ativada. Confira seu e-mail para confirmar o acesso e depois faça login.",
  };
}
