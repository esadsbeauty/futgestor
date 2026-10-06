"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentOrganizationForUser } from "@/lib/queries/participants";
import { createClient } from "@/lib/supabase/server";
import { billingModeSettingsSchema, financialSettingsSchema, organizationSettingsSchema, passwordSettingsSchema, profileSettingsSchema } from "@/lib/validators/settings";

export type SettingsActionState = {
  ok: boolean;
  message?: string;
  revision: number;
  fieldErrors?: Record<string, string[] | undefined>;
};

const failure = (previous: SettingsActionState, message: string): SettingsActionState => ({ ok: false, message, revision: previous.revision + 1 });
const validationFailure = (previous: SettingsActionState, fieldErrors: Record<string, string[] | undefined>): SettingsActionState => ({ ok: false, message: "Revise os campos destacados.", revision: previous.revision + 1, fieldErrors });

export async function updateOrganizationSettings(previous: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  const parsed = organizationSettingsSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return validationFailure(previous, parsed.error.flatten().fieldErrors);
  try {
    const organization = await getCurrentOrganizationForUser();
    const supabase = await createClient();
    const { data, error } = await supabase.from("organizations").update(parsed.data).eq("id", organization.id).select("id").maybeSingle();
    if (error || !data) return failure(previous, "Não foi possível atualizar os dados do grupo.");
    revalidatePath("/configuracoes");
    revalidatePath("/dashboard");
    return { ok: true, message: "Dados do grupo atualizados.", revision: previous.revision + 1 };
  } catch {
    return failure(previous, "Não foi possível atualizar os dados do grupo.");
  }
}

export async function updateFinancialSettings(previous: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  const parsed = financialSettingsSchema.safeParse({ default_monthly_fee: formData.get("default_monthly_fee"), default_due_day: formData.get("default_due_day") });
  if (!parsed.success) return validationFailure(previous, parsed.error.flatten().fieldErrors);
  try {
    const organization = await getCurrentOrganizationForUser();
    const supabase = await createClient();
    const { data, error } = await supabase.from("organizations").update(parsed.data).eq("id", organization.id).select("id").maybeSingle();
    if (error || !data) return failure(previous, "Não foi possível atualizar as configurações financeiras.");
    revalidatePath("/configuracoes");
    revalidatePath("/participantes");
    return { ok: true, message: "Configurações financeiras atualizadas.", revision: previous.revision + 1 };
  } catch {
    return failure(previous, "Não foi possível atualizar as configurações financeiras.");
  }
}

export async function updateBillingMode(previous: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  const parsed = billingModeSettingsSchema.safeParse({ billing_mode: formData.get("billing_mode") });
  if (!parsed.success) return validationFailure(previous, parsed.error.flatten().fieldErrors);
  try {
    const organization = await getCurrentOrganizationForUser();
    const supabase = await createClient();
    const { data, error } = await supabase.from("organizations").update(parsed.data).eq("id", organization.id).select("id").maybeSingle();
    if (error || !data) return failure(previous, "Não foi possível atualizar o modelo de cobrança.");
    revalidatePath("/configuracoes");
    revalidatePath("/participantes");
    revalidatePath("/financeiro");
    revalidatePath("/dashboard");
    return { ok: true, message: "Modelo de cobrança atualizado.", revision: previous.revision + 1 };
  } catch {
    return failure(previous, "Não foi possível atualizar o modelo de cobrança.");
  }
}

export async function updateProfile(previous: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  const parsed = profileSettingsSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return validationFailure(previous, parsed.error.flatten().fieldErrors);
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return failure(previous, "Sua sessão expirou. Entre novamente.");
    const { data, error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id).select("id").maybeSingle();
    if (error || !data) return failure(previous, "Não foi possível atualizar o perfil.");
    revalidatePath("/configuracoes");
    revalidatePath("/dashboard");
    return { ok: true, message: "Perfil atualizado.", revision: previous.revision + 1 };
  } catch {
    return failure(previous, "Não foi possível atualizar o perfil.");
  }
}

export async function updatePassword(previous: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  const parsed = passwordSettingsSchema.safeParse({ password: formData.get("password"), passwordConfirmation: formData.get("passwordConfirmation") });
  if (!parsed.success) return validationFailure(previous, parsed.error.flatten().fieldErrors);
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return failure(previous, "Sua sessão expirou. Entre novamente.");
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (error) return failure(previous, "Não foi possível alterar a senha. Tente novamente.");
    return { ok: true, message: "Senha alterada com sucesso.", revision: previous.revision + 1 };
  } catch {
    return failure(previous, "Não foi possível alterar a senha. Tente novamente.");
  }
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
