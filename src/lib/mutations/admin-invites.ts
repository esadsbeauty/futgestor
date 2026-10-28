"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { bahiaDateString } from "@/lib/timezone";

export type AdminInviteActionState = {
  ok: boolean;
  message?: string;
  temporaryPassword?: string;
  email?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

const schema = z.object({
  token: z.string().min(20),
  email: z.string().trim().email(),
  name: z.string().trim().min(2, "Informe seu nome."),
});

function generateTemporaryPassword() {
  const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 8);
  return `Fut@${suffix}9A`;
}

async function ensureAdminParticipant(
  admin: ReturnType<typeof createAdminClient>,
  organizationId: string,
  userId: string,
  name: string
) {
  const { data: existingPlayer } = await admin
    .from("players")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingPlayer) return;

  const { data: organization, error: organizationError } = await admin
    .from("organizations")
    .select("default_monthly_fee,default_due_day,billing_mode")
    .eq("id", organizationId)
    .maybeSingle();

  if (organizationError || !organization) {
    throw new Error("Não foi possível carregar os dados do grupo.");
  }

  const billingType =
    organization.billing_mode === "monthly" ? "monthly" : "per_game";

  const { error: playerError } = await admin.from("players").insert({
    organization_id: organizationId,
    user_id: userId,
    name,
    phone: null,
    monthly_fee: organization.default_monthly_fee,
    due_day: organization.default_due_day,
    joined_at: bahiaDateString(),
    status: "active",
    billing_type: billingType,
    notes: "Perfil de participante criado automaticamente para administrador.",
  });

  if (playerError) {
    throw new Error("Não foi possível criar o perfil de participante do administrador.");
  }
}

export async function acceptAdminInvite(
  _: AdminInviteActionState,
  formData: FormData
): Promise<AdminInviteActionState> {
  const parsed = schema.safeParse({
    token: formData.get("token"),
    email: formData.get("email"),
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Revise os dados informados.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const admin = createAdminClient();
    const normalizedEmail = parsed.data.email.toLowerCase();

    const { data: invite, error: inviteError } = await admin
      .from("admin_invites")
      .select("id,organization_id,email,active,expires_at,accepted_at")
      .eq("token", parsed.data.token)
      .maybeSingle();

    if (
      inviteError ||
      !invite ||
      !invite.active ||
      invite.accepted_at ||
      new Date(invite.expires_at).getTime() <= Date.now() ||
      invite.email.toLowerCase() !== normalizedEmail
    ) {
      return {
        ok: false,
        message: "Este convite não está mais disponível. Solicite um novo convite.",
      };
    }

    const temporaryPassword = generateTemporaryPassword();

    const { data: existingUsers, error: listUsersError } =
      await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });

    if (listUsersError) {
      return {
        ok: false,
        message: "Não foi possível validar o acesso. Tente novamente.",
      };
    }

    const existingUser = existingUsers.users.find(
      (user) => user.email?.toLowerCase() === normalizedEmail
    );

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;

      const { error: updateUserError } =
        await admin.auth.admin.updateUserById(userId, {
          password: temporaryPassword,
          email_confirm: true,
          user_metadata: {
            ...(existingUser.user_metadata ?? {}),
            account_type: "admin",
            name: parsed.data.name,
            must_change_password: true,
          },
        });

      if (updateUserError) {
        return {
          ok: false,
          message: "Não foi possível preparar o acesso do administrador.",
        };
      }

      await admin
        .from("profiles")
        .upsert({
          id: userId,
          name: parsed.data.name,
          email: normalizedEmail,
        });

      const { error: membershipError } = await admin
        .from("organization_members")
        .upsert(
          {
            organization_id: invite.organization_id,
            user_id: userId,
            role: "admin",
          },
          { onConflict: "organization_id,user_id" }
        );

      if (membershipError) {
        return {
          ok: false,
          message: "A conta foi preparada, mas não foi possível vincular a organização.",
        };
      }

      await admin
        .from("admin_invites")
        .update({
          active: false,
          accepted_at: new Date().toISOString(),
          accepted_user_id: userId,
        })
        .eq("id", invite.id);
    } else {
      const { data: createdUser, error: createUserError } =
        await admin.auth.admin.createUser({
          email: normalizedEmail,
          password: temporaryPassword,
          email_confirm: true,
          user_metadata: {
            account_type: "admin",
            admin_invite_token: parsed.data.token,
            name: parsed.data.name,
            must_change_password: true,
          },
        });

      if (createUserError || !createdUser.user) {
        return {
          ok: false,
          message: "Não foi possível criar a conta de administrador.",
        };
      }

      userId = createdUser.user.id;
    }

    await ensureAdminParticipant(
      admin,
      invite.organization_id,
      userId,
      parsed.data.name
    );

    return {
      ok: true,
      message:
        "Acesso criado. O administrador também foi adicionado como participante. Use a senha temporária abaixo. No primeiro login será obrigatório criar uma nova senha.",
      temporaryPassword,
      email: normalizedEmail,
    };
  } catch {
    return {
      ok: false,
      message: "Não foi possível criar o acesso de administrador.",
    };
  }
}
