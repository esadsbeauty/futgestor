"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentOrganizationForUser } from "@/lib/queries/participants";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { billingModeSettingsSchema, financialSettingsSchema, financialTransparencySettingsSchema, organizationSettingsSchema, passwordSettingsSchema, profileSettingsSchema } from "@/lib/validators/settings";

export type SettingsActionState = {
  ok: boolean;
  message?: string;
  revision: number;
  fieldErrors?: Record<string, string[] | undefined>;
  inviteUrl?: string;
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


export async function updateFinancialTransparency(
  previous: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const parsed = financialTransparencySettingsSchema.safeParse({
    show_cash_balance: formData.get("show_cash_balance"),
    show_receivables: formData.get("show_receivables"),
    show_payables: formData.get("show_payables"),
    show_pending_players: formData.get("show_pending_players"),
    show_individual_values: formData.get("show_individual_values"),
  });

  if (!parsed.success) {
    return validationFailure(previous, parsed.error.flatten().fieldErrors);
  }

  try {
    const organization = await getCurrentOrganizationForUser();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("organizations")
      .update(parsed.data)
      .eq("id", organization.id)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      return failure(
        previous,
        "Não foi possível atualizar a transparência financeira."
      );
    }

    revalidatePath("/configuracoes");
    revalidatePath("/meu-grupo");

    return {
      ok: true,
      message: "Transparência financeira atualizada.",
      revision: previous.revision + 1,
    };
  } catch {
    return failure(
      previous,
      "Não foi possível atualizar a transparência financeira."
    );
  }
}


const adminInviteSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido."),
  origin: z.string().trim().url().optional().or(z.literal("")),
});

async function requireOrganizationOwner() {
  const organization = await getCurrentOrganizationForUser();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sua sessão expirou.");

  const { data, error } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organization.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || data?.role !== "owner") {
    throw new Error("Somente o proprietário pode gerenciar administradores.");
  }

  return { organization, supabase, user };
}

export async function createAdminInvite(
  previous: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const parsed = adminInviteSchema.safeParse({
    email: formData.get("email"),
    origin: formData.get("origin") || "",
  });

  if (!parsed.success) {
    return validationFailure(previous, parsed.error.flatten().fieldErrors);
  }

  try {
    const { organization, supabase, user } = await requireOrganizationOwner();
    const email = parsed.data.email.toLowerCase();

    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .ilike("email", email)
      .limit(1)
      .maybeSingle();

    if (existingProfile) {
      return failure(
        previous,
        "Este e-mail já possui uma conta. Use outro e-mail para o administrador."
      );
    }

    await supabase
      .from("admin_invites")
      .update({ active: false })
      .eq("organization_id", organization.id)
      .ilike("email", email)
      .eq("active", true)
      .is("accepted_at", null);

    const token = crypto.randomUUID() + crypto.randomUUID().replaceAll("-", "");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase.from("admin_invites").insert({
      organization_id: organization.id,
      created_by: user.id,
      email,
      token,
      expires_at: expiresAt,
    });

    if (error) {
      return failure(previous, "Não foi possível gerar o convite de administrador.");
    }

    const appOrigin = (process.env.NEXT_PUBLIC_APP_URL || parsed.data.origin || "").replace(/\/$/, "");
    const inviteUrl = appOrigin ? `${appOrigin}/convite-admin/${token}` : undefined;

    revalidatePath("/configuracoes");

    return {
      ok: true,
      message: "Convite de administrador criado.",
      revision: previous.revision + 1,
      inviteUrl,
    };
  } catch (error) {
    return failure(
      previous,
      error instanceof Error ? error.message : "Não foi possível gerar o convite."
    );
  }
}

export async function removeOrganizationAdmin(formData: FormData) {
  const memberId = String(formData.get("member_id") ?? "");

  try {
    const { organization, supabase } = await requireOrganizationOwner();

    await supabase
      .from("organization_members")
      .delete()
      .eq("id", memberId)
      .eq("organization_id", organization.id)
      .eq("role", "admin");

    revalidatePath("/configuracoes");
  } catch {
    return;
  }
}

export async function deactivateAdminInvite(formData: FormData) {
  const inviteId = String(formData.get("invite_id") ?? "");

  try {
    const { organization, supabase } = await requireOrganizationOwner();

    await supabase
      .from("admin_invites")
      .update({ active: false })
      .eq("id", inviteId)
      .eq("organization_id", organization.id);

    revalidatePath("/configuracoes");
  } catch {
    return;
  }
}
