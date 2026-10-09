"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type AdminInviteActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

const schema = z.object({
  token: z.string().min(20),
  email: z.string().trim().email(),
  name: z.string().trim().min(2, "Informe seu nome."),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres.").max(128),
  origin: z.string().trim().url().optional().or(z.literal("")),
});

function getAppOrigin(requestOrigin: string) {
  return (process.env.NEXT_PUBLIC_APP_URL || requestOrigin).replace(/\/$/, "");
}

export async function acceptAdminInvite(
  _: AdminInviteActionState,
  formData: FormData
): Promise<AdminInviteActionState> {
  const parsed = schema.safeParse({
    token: formData.get("token"),
    email: formData.get("email"),
    name: formData.get("name"),
    password: formData.get("password"),
    origin: formData.get("origin") || "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Revise os dados informados.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${getAppOrigin(parsed.data.origin)}/auth/callback`,
      data: {
        account_type: "admin",
        admin_invite_token: parsed.data.token,
        name: parsed.data.name,
      },
    },
  });

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("already") || message.includes("registered") || message.includes("exists")) {
      return {
        ok: false,
        message: "Este e-mail já possui uma conta. Solicite outro convite com um e-mail diferente.",
      };
    }

    return {
      ok: false,
      message: "Não foi possível criar a conta de administrador. Solicite um novo convite.",
    };
  }

  return {
    ok: true,
    message: data.session
      ? "Conta criada. Você já pode acessar o painel."
      : "Conta criada. Confira seu e-mail para confirmar o acesso e depois faça login.",
  };
}
