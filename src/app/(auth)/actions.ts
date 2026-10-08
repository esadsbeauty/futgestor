"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, signupSchema } from "@/lib/validators/auth";

export type AuthState = { error?: string };

export async function login(
  _: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      error: "Revise o e-mail e use uma senha de pelo menos 8 caracteres.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error || !data.user) {
    return { error: "E-mail ou senha inválidos." };
  }

  if (data.user.user_metadata?.account_type === "player") {
    redirect("/meu-grupo");
  }

  redirect("/dashboard");
}

export async function signup(
  _: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      error: "Revise os campos. O vencimento deve estar entre 1 e 31.",
    };
  }

  const supabase = await createClient();
  const origin = String(formData.get("origin"));
  const { email, password, ...data } = parsed.data;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data,
    },
  });

  if (error) return { error: error.message };

  return {
    error: "Conta criada. Confira seu e-mail para confirmar o acesso.",
  };
}

export async function recover(
  _: AuthState,
  formData: FormData
): Promise<AuthState> {
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(
    String(formData.get("email")),
    {
      redirectTo: `${formData.get("origin")}/auth/callback?next=/nova-senha`,
    }
  );

  return {
    error: error
      ? error.message
      : "Enviamos as instruções para o seu e-mail.",
  };
}


export async function updateRecoveredPassword(
  _: AuthState,
  formData: FormData
): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("password_confirmation") ?? "");

  if (password.length < 8) {
    return { error: "A senha deve ter pelo menos 8 caracteres." };
  }

  if (password !== confirmation) {
    return { error: "As senhas precisam ser iguais." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "O link expirou. Solicite uma nova recuperação de senha." };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: "Não foi possível alterar a senha. Solicite um novo link." };
  }

  redirect(user.user_metadata?.account_type === "player" ? "/meu-grupo" : "/dashboard");
}
