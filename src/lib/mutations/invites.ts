"use server";

import { revalidatePath } from "next/cache";
import { effectiveInviteBillingType } from "@/lib/invites";
import { getCurrentOrganizationForUser } from "@/lib/queries/participants";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  acceptPlayerInviteSchema,
  acceptPlayerInviteWithAccountSchema,
  createPlayerInviteSchema,
} from "@/lib/validators/invites";

export type InviteActionState = {
  ok: boolean;
  message?: string;
  token?: string;
  organizationName?: string;
  playerName?: string;
  accessToken?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

const fail = (message: string): InviteActionState => ({ ok: false, message });

function getAppOrigin(requestOrigin: string) {
  return (process.env.NEXT_PUBLIC_APP_URL || requestOrigin).replace(/\/$/, "");
}

export async function createPlayerInvite(
  _: InviteActionState,
  formData: FormData
): Promise<InviteActionState> {
  const organization = await getCurrentOrganizationForUser();
  const requested = (formData.get("billing_type") || null) as
    | "monthly"
    | "per_game"
    | null;
  const billing = effectiveInviteBillingType(
    organization.billing_mode,
    requested
  );

  const parsed = createPlayerInviteSchema.safeParse({
    billing_type: billing,
    expires_at: formData.get("expires_at") || null,
    max_uses: formData.get("max_uses") || null,
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Revise os dados do convite.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  if (organization.billing_mode === "hybrid" && !billing) {
    return fail("Selecione o tipo do convite.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return fail("Sua sessão expirou.");

  const token = `${crypto.randomUUID()}${crypto
    .randomUUID()
    .replaceAll("-", "")}`;

  const { error } = await supabase.from("player_invites").insert({
    organization_id: organization.id,
    created_by: user.id,
    token,
    ...parsed.data,
  });

  if (error) return fail("Não foi possível gerar o convite.");

  revalidatePath("/participantes");

  return {
    ok: true,
    message: "Link de convite criado.",
    token,
  };
}

export async function deactivatePlayerInvite(formData: FormData) {
  const id = String(formData.get("invite_id"));
  const organization = await getCurrentOrganizationForUser();
  const supabase = await createClient();

  await supabase
    .from("player_invites")
    .update({
      active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("organization_id", organization.id);

  revalidatePath("/participantes");
}

/**
 * Fluxo legado mantido temporariamente para links antigos.
 */
export async function acceptPlayerInvite(
  _: InviteActionState,
  formData: FormData
): Promise<InviteActionState> {
  const token = String(formData.get("token") ?? "");
  const parsed = acceptPlayerInviteSchema.safeParse({
    name: formData.get("name"),
    whatsapp: formData.get("whatsapp"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Revise os campos.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_player_invite", {
    _token: token,
    _name: parsed.data.name,
    _whatsapp: parsed.data.whatsapp,
  });

  if (error) {
    if (error.code === "23505") {
      return fail("Este WhatsApp já está cadastrado neste grupo.");
    }

    return fail("Este convite não está mais disponível.");
  }

  return {
    ok: true,
    message: "Seu cadastro foi realizado com sucesso.",
    organizationName: data?.[0]?.organization_name,
    playerName: data?.[0]?.player_name,
    accessToken: data?.[0]?.access_token,
  };
}

export async function acceptPlayerInviteWithAccount(
  _: InviteActionState,
  formData: FormData
): Promise<InviteActionState> {
  const token = String(formData.get("token") ?? "");

  const parsed = acceptPlayerInviteWithAccountSchema.safeParse({
    name: formData.get("name"),
    whatsapp: formData.get("whatsapp"),
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

  try {
    const admin = createAdminClient();
    const normalizedEmail = parsed.data.email.toLowerCase();

    const { data: inviteData, error: inviteError } = await admin.rpc(
      "get_player_invite",
      { _token: token }
    );

    if (inviteError || !inviteData?.[0]?.available) {
      return fail("Este convite não está mais disponível.");
    }

    const { data: existingUsers, error: listUsersError } =
      await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });

    if (listUsersError) {
      return fail("Não foi possível validar o e-mail informado.");
    }

    const emailExists = existingUsers.users.some(
      (user) => user.email?.toLowerCase() === normalizedEmail
    );

    if (emailExists) {
      return fail(
        "Este e-mail já possui uma conta. Entre com sua senha ou solicite um novo acesso ao responsável."
      );
    }

    const { data: createdUser, error: createUserError } =
      await admin.auth.admin.createUser({
        email: normalizedEmail,
        password: parsed.data.password,
        email_confirm: true,
        user_metadata: {
          account_type: "player",
          invite_token: token,
          name: parsed.data.name,
          whatsapp: parsed.data.whatsapp,
        },
      });

    if (createUserError || !createdUser.user) {
      const message = createUserError?.message?.toLowerCase() ?? "";

      if (
        message.includes("whatsapp") ||
        message.includes("duplicate") ||
        message.includes("already registered")
      ) {
        return fail("Este WhatsApp já está cadastrado neste grupo.");
      }

      return fail(
        "Não foi possível criar sua conta. Verifique os dados e tente novamente."
      );
    }

    return {
      ok: true,
      message: "Conta criada. Você já pode entrar no seu grupo.",
      playerName: parsed.data.name,
    };
  } catch {
    return fail(
      "Não foi possível criar sua conta. Verifique os dados e tente novamente."
    );
  }
}
