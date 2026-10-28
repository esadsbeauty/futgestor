"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentOrganizationForUser } from "@/lib/queries/participants";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { gameEventSchema,gameExpenseSchema,gamePlayersSchema,gameSchema,publicGameConfirmationSchema } from "@/lib/validators/games";
import { effectivePlayerBillingType, shouldGenerateMonthlyFee } from "@/lib/billing";
import { currentReferenceMonth } from "@/lib/queries/participants";
import { z } from "zod";
import { bahiaDateString } from "@/lib/timezone";
import { balanceGameTeams } from "@/lib/team-balance";

export type GameActionState={ok:boolean;message?:string;fieldErrors?:Record<string,string[]|undefined>};
const fail=(message:string):GameActionState=>({ok:false,message});
const payload=(f:FormData)=>({title:f.get("title"),game_date:f.get("game_date"),start_time:f.get("start_time")??"",location:f.get("location")??"",player_price:f.get("player_price"),notes:f.get("notes")??"",status:f.get("status")??"scheduled",game_format:f.get("game_format")??"court"});
export async function createGame(_:GameActionState,f:FormData):Promise<GameActionState>{const p=gameSchema.safeParse(payload(f));if(!p.success)return{ok:false,message:"Revise os campos.",fieldErrors:p.error.flatten().fieldErrors};let id:string|undefined;try{const o=await getCurrentOrganizationForUser();const s=await createClient();const{data,error}=await s.from("games").insert({...p.data,start_time:p.data.start_time||null,organization_id:o.id,created_by:(await s.auth.getUser()).data.user!.id}).select("id").single();if(error)return fail("Não foi possível criar o jogo.");id=data.id;}catch{return fail("Não foi possível criar o jogo.");}redirect(`/jogos/${id}`);}
export async function respondOwnGameAttendance(
  _: GameActionState,
  formData: FormData
): Promise<GameActionState> {
  const gameId = String(formData.get("game_id") ?? "");
  const status = String(formData.get("status") ?? "");
  const position = String(formData.get("position") ?? "");

  if (!gameId || !["confirmed", "declined"].includes(status)) {
    return fail("Resposta de presença inválida.");
  }
  if (status === "confirmed" && !position) {
    return fail("Escolha sua posição antes de confirmar.");
  }

  try {
    const organization = await getCurrentOrganizationForUser();
    const supabase = await createClient();

    const { data: game, error: gameError } = await supabase
      .from("games")
      .select("id,status")
      .eq("id", gameId)
      .eq("organization_id", organization.id)
      .maybeSingle();

    if (gameError || !game) return fail("Jogo não encontrado.");
    if (game.status !== "scheduled") return fail("Este jogo não aceita mais confirmações.");

    const { error } = await supabase.rpc("respond_my_game_attendance", {
      _game_id: gameId,
      _status: status,
      _position: status === "confirmed" ? position : null,
    });

    if (error) {
      const message = error.message?.includes("payment already registered")
        ? "Existe um pagamento registrado. Resolva o pagamento antes de alterar para “Não vou”."
        : "Não foi possível atualizar sua presença.";
      return fail(message);
    }

    revalidatePath(`/jogos/${gameId}`);
    revalidatePath("/jogos");
    revalidatePath("/meu-grupo");

    return {
      ok: true,
      message: status === "confirmed" ? "Presença confirmada." : "Presença atualizada para “Não vou”.",
    };
  } catch {
    return fail("Não foi possível atualizar sua presença.");
  }
}

export async function updateGame(_:GameActionState,f:FormData):Promise<GameActionState>{const id=String(f.get("game_id")??"");const p=gameSchema.safeParse(payload(f));if(!p.success)return{ok:false,message:"Revise os campos.",fieldErrors:p.error.flatten().fieldErrors};const o=await getCurrentOrganizationForUser();const s=await createClient();const{data,error}=await s.from("games").update({...p.data,start_time:p.data.start_time||null,updated_at:new Date().toISOString()}).eq("id",id).eq("organization_id",o.id).select("id").maybeSingle();if(error||!data)return fail("Não foi possível atualizar o jogo.");revalidatePath(`/jogos/${id}`);revalidatePath("/jogos");return{ok:true,message:"Jogo atualizado."};}
export async function addPlayersToGame(
  _: GameActionState,
  formData: FormData
): Promise<GameActionState> {
  const gameId = String(formData.get("game_id") ?? "");
  const parsed = gamePlayersSchema.safeParse({
    player_ids: formData.getAll("player_ids"),
  });

  if (!parsed.success) return fail("Selecione ao menos um jogador.");

  const organization = await getCurrentOrganizationForUser();
  const supabase = await createClient();

  const [
    { data: game, error: gameError },
    { data: players, error: playersError },
  ] = await Promise.all([
    supabase
      .from("games")
      .select("id,game_format,status")
      .eq("id", gameId)
      .eq("organization_id", organization.id)
      .maybeSingle(),
    supabase
      .from("players")
      .select("id,default_position,default_futsal_position,default_field_position")
      .eq("organization_id", organization.id)
      .eq("status", "active")
      .in("id", parsed.data.player_ids),
  ]);

  if (gameError || !game || playersError || !players?.length) {
    return fail("Jogo ou jogadores inválidos.");
  }
  if (game.status !== "scheduled") {
    return fail("Não é possível adicionar jogadores a uma partida encerrada ou cancelada.");
  }
  if (players.length !== new Set(parsed.data.player_ids).size) {
    return fail("Um ou mais participantes não estão ativos neste grupo.");
  }

  // A confirmação administrativa não deve reabrir cobranças ou alterar pagamentos existentes.
  const { data: existing, error: rosterError } = await supabase
    .from("game_players")
    .select("player_id,payment_status")
    .eq("organization_id", organization.id)
    .eq("game_id", gameId)
    .in("player_id", parsed.data.player_ids);
  if (rosterError) return fail("Não foi possível verificar a situação dos jogadores.");
  if ((existing ?? []).some((entry) => entry.payment_status === "paid")) {
    return fail("Há jogador com pagamento registrado. Resolva a situação financeira antes de alterar a presença.");
  }

  const sportType = game.game_format === "field" ? "football" : "futsal";

  const { error } = await supabase.from("game_attendances").upsert(
    players.map((player) => ({
      organization_id: organization.id,
      game_id: gameId,
      player_id: player.id,
      status: "confirmed",
      sport_type: sportType,
      position:
        sportType === "football"
          ? player.default_field_position ?? player.default_position
          : player.default_futsal_position ?? player.default_position,
      responded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "game_id,player_id" }
  );

  if (error) return fail("Não foi possível adicionar os jogadores ao jogo.");

  revalidatePath(`/jogos/${gameId}`);
  revalidatePath("/financeiro");
  revalidatePath("/dashboard");

  return { ok: true, message: "Jogadores adicionados ao jogo." };
}

export async function removePendingGameCharge(f:FormData){const id=String(f.get("charge_id"));const game=String(f.get("game_id"));const o=await getCurrentOrganizationForUser();const s=await createClient();await s.from("game_charges").delete().eq("id",id).eq("game_id",game).eq("organization_id",o.id).eq("status","pending");revalidatePath(`/jogos/${game}`);}
export async function payGameCharge(f:FormData){const id=String(f.get("charge_id"));const game=String(f.get("game_id"));const o=await getCurrentOrganizationForUser();const s=await createClient();const{data}=await s.from("game_charges").select("id").eq("id",id).eq("game_id",game).eq("organization_id",o.id).maybeSingle();if(data)await s.rpc("mark_game_charge_paid",{_charge:id});revalidatePath(`/jogos/${game}`);revalidatePath("/financeiro");}
export async function createGameExpense(_:GameActionState,f:FormData):Promise<GameActionState>{const game=String(f.get("game_id"));const p=gameExpenseSchema.safeParse({description:f.get("description"),category:f.get("category"),amount:f.get("amount")});if(!p.success)return{ok:false,message:"Revise os campos.",fieldErrors:p.error.flatten().fieldErrors};const o=await getCurrentOrganizationForUser();const s=await createClient();const{data:g}=await s.from("games").select("id").eq("id",game).eq("organization_id",o.id).maybeSingle();if(!g)return fail("Jogo inválido.");const{error}=await s.from("game_expenses").insert({...p.data,organization_id:o.id,game_id:game});if(error)return fail("Não foi possível adicionar a despesa.");revalidatePath(`/jogos/${game}`);return{ok:true,message:"Despesa adicionada."};}
export async function payGameExpense(_:GameActionState,f:FormData):Promise<GameActionState>{const id=String(f.get("expense_id")??"");const game=String(f.get("game_id")??"");if(!id||!game)return fail("Despesa inválida.");const o=await getCurrentOrganizationForUser();const s=await createClient();const{data,error:lookupError}=await s.from("game_expenses").select("id,status").eq("id",id).eq("game_id",game).eq("organization_id",o.id).maybeSingle();if(lookupError||!data)return fail("Despesa não encontrada.");if(data.status==="paid")return{ok:true,message:"Despesa já estava paga."};const{error}=await s.rpc("mark_game_expense_paid",{_expense:id});if(error)return fail("Não foi possível marcar a despesa como paga.");revalidatePath(`/jogos/${game}`);revalidatePath("/financeiro");revalidatePath("/dashboard");return{ok:true,message:"Despesa marcada como paga."};}


export async function createGameEvent(
  _: GameActionState,
  formData: FormData
): Promise<GameActionState> {
  const gameId = String(formData.get("game_id") ?? "");
  const selection = String(formData.get("player_id") ?? "");
  const guestId = selection.startsWith("guest:") ? selection.slice(6) : null;
  const parsed = gameEventSchema.safeParse({
    player_id: guestId ? null : selection,
    guest_confirmation_id: guestId,
    event_type: formData.get("event_type"),
    quantity: formData.get("quantity"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Revise os dados do destaque.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const organization = await getCurrentOrganizationForUser();
  const supabase = await createClient();

  const [
    { data: game },
    { data: player },
    { data: { user } },
  ] = await Promise.all([
    supabase
      .from("games")
      .select("id")
      .eq("id", gameId)
      .eq("organization_id", organization.id)
      .maybeSingle(),
    guestId
      ? supabase.from("game_guest_confirmations").select("id")
          .eq("id", guestId).eq("game_id", gameId)
          .eq("organization_id", organization.id).eq("attendance_status", "confirmed").maybeSingle()
      : supabase.from("players").select("id")
          .eq("id", parsed.data.player_id!)
          .eq("organization_id", organization.id).maybeSingle(),
    supabase.auth.getUser(),
  ]);

  if (!game || !player || !user) {
    return fail("Jogo ou participante inválido.");
  }

  const { error } = await supabase.from("game_events").insert({
    organization_id: organization.id,
    game_id: gameId,
    player_id: guestId ? null : player.id,
    guest_confirmation_id: guestId ? player.id : null,
    event_type: parsed.data.event_type,
    quantity: parsed.data.quantity,
    created_by: user.id,
  });

  if (error) return fail("Não foi possível registrar o destaque.");

  revalidatePath(`/jogos/${gameId}`);
  return { ok: true, message: "Destaque registrado." };
}

export async function removeGameEvent(
  _: GameActionState,
  formData: FormData
): Promise<GameActionState> {
  const eventId = String(formData.get("event_id") ?? "");
  const gameId = String(formData.get("game_id") ?? "");
  if (!eventId || !gameId) return fail("Destaque inválido.");

  const organization = await getCurrentOrganizationForUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("game_events")
    .delete()
    .eq("id", eventId)
    .eq("game_id", gameId)
    .eq("organization_id", organization.id);

  if (error) return fail("Não foi possível remover o destaque.");

  revalidatePath(`/jogos/${gameId}`);
  return { ok: true, message: "Destaque removido." };
}


export async function confirmPublicGamePresence(
  _: GameActionState,
  formData: FormData
): Promise<GameActionState> {
  const token = String(formData.get("token") ?? "");
  const parsed = publicGameConfirmationSchema.safeParse({
    name: formData.get("name"),
    attendance_status: formData.get("attendance_status"),
    sport_type: formData.get("sport_type") || null,
    position: formData.get("position") || null,
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Revise seu nome e a posição.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_public_game_presence", {
    _token: token,
    _name: parsed.data.name,
    _attendance_status: parsed.data.attendance_status,
    _sport_type: parsed.data.sport_type,
    _position: parsed.data.position,
  });

  if (error) {
    return fail("Não foi possível confirmar sua presença. Verifique se o convite ainda está ativo.");
  }

  revalidatePath(`/confirmar-jogo/${token}`);
  return {
    ok: true,
    message:
      parsed.data.attendance_status === "confirmed"
        ? "Presença confirmada com sucesso!"
        : "Resposta registrada. Você não vai participar deste jogo.",
  };
}

export async function drawPublicGameTeams(
  _: GameActionState,
  formData: FormData
): Promise<GameActionState> {
  const gameId = String(formData.get("game_id") ?? "");
  const organization = await getCurrentOrganizationForUser();
  const supabase = await createClient();

  const { data: game, error: gameError } = await supabase.from("games").select("status").eq("id", gameId).eq("organization_id", organization.id).maybeSingle();
  if (gameError || !game) return fail("Jogo não encontrado.");
  if (game.status !== "scheduled") return fail("Não é possível sortear times após o encerramento ou cancelamento.");

  const { data: roster, error } = await supabase
    .from("game_players")
    .select("id,source,guest_confirmation_id,player_id,position,sport_type")
    .eq("organization_id", organization.id)
    .eq("game_id", gameId)
    .eq("attendance_status", "confirmed");

  if (error) return fail("Não foi possível carregar os jogadores para o sorteio.");
  if (!roster || roster.length < 2) return fail("É necessário ter pelo menos 2 jogadores confirmados.");

  const eligible = roster.filter((player) => player.position && player.sport_type);
  if (eligible.length !== roster.length) {
    return fail("Defina a posição dos jogadores confirmados antes de sortear.");
  }
  const ids = [...new Set(eligible.flatMap((player) => player.player_id ? [player.player_id] : []))];
  const { data: levels, error: levelsError } = ids.length
    ? await supabase.from("players").select("id,technical_level")
        .eq("organization_id", organization.id).in("id", ids)
    : { data: [], error: null };
  if (levelsError) return fail("Não foi possível carregar as avaliações técnicas.");
  const technicalLevels = new Map((levels ?? []).map((player) => [player.id, Number(player.technical_level)]));
  const balanced = balanceGameTeams(eligible.map((player) => ({
    ...player,
    technicalLevel: player.player_id ? (technicalLevels.get(player.player_id) ?? 3) : 3,
  })));
  const teams = { 1: balanced.one, 2: balanced.two };
  const { error: clearError } = await supabase
    .from("game_players")
    .update({ team_number: null, updated_at: new Date().toISOString() })
    .eq("organization_id", organization.id)
    .eq("game_id", gameId);
  if (clearError) return fail("Não foi possível limpar os times.");

  const assignments = ([1, 2] as const).flatMap((team) =>
    teams[team].map((player) => ({ ...player, team }))
  );

  try {
  await Promise.all(
    assignments.map(async (player) => {
      const { error: assignmentError } = await supabase
        .from("game_players")
        .update({ team_number: player.team, updated_at: new Date().toISOString() })
        .eq("id", player.id)
        .eq("organization_id", organization.id)
        .eq("game_id", gameId);
      if (assignmentError) throw new Error("Falha ao salvar time.");

      if (player.source === "guest" && player.guest_confirmation_id) {
        const { error: guestError } = await supabase
          .from("game_guest_confirmations")
          .update({ team_number: player.team, updated_at: new Date().toISOString() })
          .eq("id", player.guest_confirmation_id)
          .eq("organization_id", organization.id)
          .eq("game_id", gameId);
        if (guestError) throw new Error("Falha na sincronização do convidado.");
      }

      if (player.source === "participant" && player.player_id) {
        const { error: attendanceError } = await supabase
          .from("game_attendances")
          .update({ team_number: player.team, updated_at: new Date().toISOString() })
          .eq("player_id", player.player_id)
          .eq("organization_id", organization.id)
          .eq("game_id", gameId);
        if (attendanceError) throw new Error("Falha na sincronização do participante.");
      }
    })
  );
  } catch {
    return fail("Sorteio não concluído. Confira os times e tente novamente.");
  }

  revalidatePath(`/jogos/${gameId}`);
  revalidatePath("/meu-grupo");
  return { ok: true, message: "Times sorteados com sucesso." };
}
export async function updatePublicGameConfirmation(
  _: GameActionState,
  formData: FormData
): Promise<GameActionState> {
  const confirmationId = String(formData.get("confirmation_id") ?? "");
  const gameId = String(formData.get("game_id") ?? "");

  const parsed = publicGameConfirmationSchema.safeParse({
    name: formData.get("name"),
    attendance_status: formData.get("attendance_status"),
    sport_type: formData.get("sport_type") || null,
    position: formData.get("position") || null,
  });

  if (!confirmationId || !gameId || !parsed.success) {
    return {
      ok: false,
      message: "Revise os dados do jogador.",
      fieldErrors: parsed.success ? undefined : parsed.error.flatten().fieldErrors,
    };
  }

  const organization = await getCurrentOrganizationForUser();
  const supabase = await createClient();

  const { data: game, error: gameError } = await supabase.from("games")
    .select("status").eq("id", gameId).eq("organization_id", organization.id).maybeSingle();
  if (gameError || !game) return fail("Jogo não encontrado.");
  if (game.status !== "scheduled") return fail("Não é possível alterar participantes após o encerramento ou cancelamento.");

  const { data: confirmation, error: lookupError } = await supabase
    .from("game_guest_confirmations")
    .select("id,payment_status,player_id")
    .eq("id", confirmationId)
    .eq("game_id", gameId)
    .eq("organization_id", organization.id)
    .maybeSingle();

  if (lookupError || !confirmation) {
    return fail("Jogador não encontrado neste jogo.");
  }

  if (
    confirmation.payment_status === "paid" &&
    parsed.data.attendance_status === "declined"
  ) {
    return fail(
      "Este jogador já possui pagamento registrado. O pagamento precisa ser tratado antes de marcar como não vai."
    );
  }

  const { error } = await supabase
    .from("game_guest_confirmations")
    .update({
      name: parsed.data.name,
      attendance_status: parsed.data.attendance_status,
      sport_type:
        parsed.data.attendance_status === "confirmed"
          ? parsed.data.sport_type
          : null,
      position:
        parsed.data.attendance_status === "confirmed"
          ? parsed.data.position
          : null,
      team_number: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", confirmationId)
    .eq("game_id", gameId)
    .eq("organization_id", organization.id);

  if (error) return fail("Não foi possível atualizar o jogador.");

  if (confirmation.player_id && parsed.data.attendance_status === "confirmed" && parsed.data.position) {
    const positionUpdate =
      parsed.data.sport_type === "football"
        ? {
            default_position: parsed.data.position,
            default_field_position: parsed.data.position,
          }
        : {
            default_position: parsed.data.position,
            default_futsal_position: parsed.data.position,
          };

    await supabase
      .from("players")
      .update(positionUpdate)
      .eq("id", confirmation.player_id)
      .eq("organization_id", organization.id);
  }

  await supabase
    .from("game_guest_confirmations")
    .update({ team_number: null, updated_at: new Date().toISOString() })
    .eq("game_id", gameId)
    .eq("organization_id", organization.id);

  revalidatePath(`/jogos/${gameId}`);
  revalidatePath("/jogos");
  return { ok: true, message: "Jogador atualizado." };
}

export async function removeParticipantFromGame(
  _: GameActionState,
  formData: FormData
): Promise<GameActionState> {
  const gameId = String(formData.get("game_id") ?? "");
  const rosterId = String(formData.get("roster_id") ?? "");
  if (!gameId || !rosterId) return fail("Jogador inválido.");

  const organization = await getCurrentOrganizationForUser();
  const supabase = await createClient();
  const { data: game, error: gameError } = await supabase.from("games")
    .select("status").eq("id", gameId).eq("organization_id", organization.id).maybeSingle();
  if (gameError || !game) return fail("Jogo não encontrado.");
  if (game.status === "canceled") return fail("Não é possível alterar um jogo cancelado.");

  const { data: roster, error: rosterError } = await supabase.from("game_players")
    .select("player_id,payment_status,source")
    .eq("id", rosterId).eq("game_id", gameId)
    .eq("organization_id", organization.id).maybeSingle();
  if (rosterError || !roster || roster.source !== "participant" || !roster.player_id)
    return fail("Participante não encontrado nesta partida.");
  if (roster.payment_status === "paid")
    return fail("Pagamento recebido. Resolva o pagamento antes de retirar este jogador.");

  if (game.status === "completed") {
    const { count, error: eventsError } = await supabase.from("game_events")
      .select("id", { count: "exact", head: true })
      .eq("game_id", gameId).eq("organization_id", organization.id)
      .eq("player_id", roster.player_id);
    if (eventsError) return fail("Não foi possível verificar os destaques deste jogador.");
    if ((count ?? 0) > 0) {
      return fail("Há gols ou cartões registrados para este jogador. Corrija esses registros antes de retirá-lo do jogo.");
    }
  }

  // O trigger de presença limpa a escalação e a cobrança pendente, sem apagar o cadastro.
  const { data: deleted, error } = await supabase.from("game_attendances")
    .delete().eq("game_id", gameId).eq("organization_id", organization.id)
    .eq("player_id", roster.player_id).select("id");
  if (error || !deleted?.length) return fail("Não foi possível retirar este participante.");

  revalidatePath(`/jogos/${gameId}`);
  revalidatePath("/jogos");
  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
  revalidatePath("/meu-grupo");
  return { ok: true, message: "Participante retirado somente desta partida." };
}

export async function removePublicGameConfirmation(
  _: GameActionState,
  formData: FormData
): Promise<GameActionState> {
  const confirmationId = String(formData.get("confirmation_id") ?? "");
  const gameId = String(formData.get("game_id") ?? "");
  if (!confirmationId || !gameId) return fail("Jogador inválido.");

  const organization = await getCurrentOrganizationForUser();
  const supabase = await createClient();

  const { data: game, error: gameError } = await supabase.from("games")
    .select("status").eq("id", gameId).eq("organization_id", organization.id).maybeSingle();
  if (gameError || !game) return fail("Jogo não encontrado.");
  if (game.status !== "scheduled") return fail("Não é possível alterar participantes após o encerramento ou cancelamento.");

  const { data: confirmation, error: lookupError } = await supabase
    .from("game_guest_confirmations")
    .select("id,payment_status")
    .eq("id", confirmationId)
    .eq("game_id", gameId)
    .eq("organization_id", organization.id)
    .maybeSingle();

  if (lookupError || !confirmation) return fail("Convidado não encontrado.");
  if (confirmation.payment_status === "paid") {
    return fail("Este convidado possui pagamento registrado e não pode ser excluído.");
  }

  const { error } = await supabase
    .from("game_guest_confirmations")
    .delete()
    .eq("id", confirmationId)
    .eq("game_id", gameId)
    .eq("organization_id", organization.id);

  if (error) return fail("Não foi possível excluir o convidado.");

  revalidatePath(`/jogos/${gameId}`);
  revalidatePath("/jogos");
  return { ok: true, message: "Convidado removido do jogo." };
}


export type GuestPromotionActionState = {
  ok: boolean;
  message?: string;
  temporaryPassword?: string;
  participantId?: string;
  email?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

const promoteGuestSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido."),
  phone: z
    .string()
    .trim()
    .max(30, "O WhatsApp é muito longo.")
    .transform((value) => value || null),
  billing_type: z.enum(["monthly", "per_game"]),
});

function generateTemporaryPassword() {
  const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 8);
  return `Fut@${suffix}9A`;
}

export async function promoteGameGuestToParticipant(
  _: GuestPromotionActionState,
  formData: FormData
): Promise<GuestPromotionActionState> {
  const confirmationId = String(formData.get("confirmation_id") ?? "");
  const gameId = String(formData.get("game_id") ?? "");

  const parsed = promoteGuestSchema.safeParse({
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    billing_type: formData.get("billing_type") ?? "per_game",
  });

  if (!confirmationId || !gameId || !parsed.success) {
    return {
      ok: false,
      message: "Revise os dados do participante.",
      fieldErrors: parsed.success ? undefined : parsed.error.flatten().fieldErrors,
    };
  }

  const organization = await getCurrentOrganizationForUser();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Sua sessão expirou." };
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organization.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return {
      ok: false,
      message: "Apenas proprietários e administradores podem criar acessos.",
    };
  }

  const { data: guest, error: guestError } = await supabase
    .from("game_guest_confirmations")
    .select("id,name,attendance_status,player_id,position,sport_type")
    .eq("id", confirmationId)
    .eq("game_id", gameId)
    .eq("organization_id", organization.id)
    .maybeSingle();

  if (guestError || !guest) {
    return { ok: false, message: "Jogador não encontrado neste jogo." };
  }

  if (guest.player_id) {
    return {
      ok: false,
      message: "Este jogador já foi transformado em participante.",
      participantId: guest.player_id,
    };
  }

  const admin = createAdminClient();
  const { data: existingUsers, error: listUsersError } =
    await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });

  if (listUsersError) {
    return {
      ok: false,
      message: "Não foi possível verificar o e-mail informado.",
    };
  }

  const normalizedEmail = parsed.data.email.toLowerCase();
  const emailExists = existingUsers.users.some(
    (existingUser) => existingUser.email?.toLowerCase() === normalizedEmail
  );

  if (emailExists) {
    return {
      ok: false,
      message:
        "Este e-mail já possui uma conta no FutGestor. Use outro e-mail neste primeiro momento.",
    };
  }

  const billingType = effectivePlayerBillingType(
    organization.billing_mode,
    parsed.data.billing_type
  );

  const { data: participant, error: participantError } = await supabase
    .from("players")
    .insert({
      organization_id: organization.id,
      name: guest.name,
      phone: parsed.data.phone,
      monthly_fee: organization.default_monthly_fee,
      due_day: organization.default_due_day,
      joined_at: bahiaDateString(),
      status: "active",
      billing_type: billingType,
      notes: "Criado a partir da confirmação pública de um jogo.",
    })
    .select("id")
    .single();

  if (participantError || !participant) {
    return {
      ok: false,
      message: "Não foi possível criar o participante.",
    };
  }

  const accessToken =
    crypto.randomUUID() + crypto.randomUUID().replaceAll("-", "");

  const { error: accessError } = await supabase
    .from("player_access_tokens")
    .insert({
      organization_id: organization.id,
      player_id: participant.id,
      token: accessToken,
    });

  if (accessError) {
    await supabase
      .from("players")
      .delete()
      .eq("id", participant.id)
      .eq("organization_id", organization.id);

    return {
      ok: false,
      message: "Não foi possível preparar o acesso do participante.",
    };
  }

  const temporaryPassword = generateTemporaryPassword();

  const { data: createdUser, error: createUserError } =
    await admin.auth.admin.createUser({
      email: normalizedEmail,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        account_type: "player",
        player_access_token: accessToken,
        name: guest.name,
        must_change_password: true,
      },
    });

  if (createUserError || !createdUser.user) {
    await supabase
      .from("player_access_tokens")
      .delete()
      .eq("player_id", participant.id)
      .eq("organization_id", organization.id);

    await supabase
      .from("players")
      .delete()
      .eq("id", participant.id)
      .eq("organization_id", organization.id);

    return {
      ok: false,
      message:
        "Não foi possível criar a conta de acesso. Verifique o e-mail e tente novamente.",
    };
  }

  const { error: linkError } = await supabase
    .from("game_guest_confirmations")
    .update({
      player_id: participant.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", confirmationId)
    .eq("game_id", gameId)
    .eq("organization_id", organization.id);

  if (linkError) {
    return {
      ok: false,
      message:
        "A conta foi criada, mas não foi possível vincular ao jogador do jogo. Verifique em Participantes.",
      participantId: participant.id,
      temporaryPassword,
      email: normalizedEmail,
    };
  }

  if (
    guest.attendance_status === "confirmed" &&
    shouldGenerateMonthlyFee(organization.billing_mode, billingType)
  ) {
    await supabase.rpc("ensure_month_fees", {
      _org: organization.id,
      _month: currentReferenceMonth(),
    });
  }

  revalidatePath(`/jogos/${gameId}`);
  revalidatePath("/participantes");
  revalidatePath("/dashboard");

  return {
    ok: true,
    message:
      "Participante criado. Copie a senha temporária agora; ela não será exibida novamente.",
    temporaryPassword,
    participantId: participant.id,
    email: normalizedEmail,
  };
}


export async function markPublicGameGuestPaid(formData: FormData) {
  const confirmationId = String(formData.get("confirmation_id") ?? "");
  const gameId = String(formData.get("game_id") ?? "");

  if (!confirmationId || !gameId) return;

  const organization = await getCurrentOrganizationForUser();
  const supabase = await createClient();

  const { data: roster, error: lookupError } = await supabase
    .from("game_players")
    .select("id,payment_status")
    .eq("guest_confirmation_id", confirmationId)
    .eq("game_id", gameId)
    .eq("organization_id", organization.id)
    .eq("source", "guest")
    .eq("attendance_status", "confirmed")
    .maybeSingle();

  if (lookupError || !roster) {
    throw new Error("Convidado não encontrado na escalação do jogo.");
  }
  if (roster.payment_status === "not_required") {
    throw new Error("Este convidado não possui cobrança neste jogo.");
  }
  if (roster.payment_status !== "paid") {
    const { error } = await supabase.rpc("mark_game_player_paid", {
      _game_player: roster.id,
    });
    if (error) throw new Error("Não foi possível registrar o pagamento do convidado.");
  }

  revalidatePath(`/jogos/${gameId}`);
  revalidatePath("/jogos");
  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
}


export async function markGameRosterPlayerPaid(
  _: GameActionState,
  formData: FormData
): Promise<GameActionState> {
  const rosterId = String(formData.get("roster_id") ?? "");
  const gameId = String(formData.get("game_id") ?? "");
  if (!rosterId || !gameId) return fail("Jogador inválido.");

  const organization = await getCurrentOrganizationForUser();
  const supabase = await createClient();

  const { data: roster, error: lookupError } = await supabase
    .from("game_players")
    .select("id,payment_status")
    .eq("id", rosterId)
    .eq("game_id", gameId)
    .eq("organization_id", organization.id)
    .eq("attendance_status", "confirmed")
    .maybeSingle();

  if (lookupError || !roster) return fail("Jogador não encontrado neste jogo.");
  if (roster.payment_status === "paid") return { ok: true, message: "Pagamento já estava registrado." };
  if (roster.payment_status === "not_required") return fail("Este jogador não possui cobrança neste jogo.");

  const { error } = await supabase.rpc("mark_game_player_paid", { _game_player: roster.id });
  if (error) return fail("Não foi possível registrar o pagamento.");

  revalidatePath(`/jogos/${gameId}`);
  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
  revalidatePath("/meu-grupo");

  return { ok: true, message: "Pagamento registrado com sucesso." };
}


export async function updateGamePlayerTeam(
  _: GameActionState,
  formData: FormData
): Promise<GameActionState> {
  const rosterId = String(formData.get("roster_id") ?? "");
  const gameId = String(formData.get("game_id") ?? "");
  const teamNumber = Number(formData.get("team_number") ?? 0);

  if (!rosterId || !gameId || ![1, 2].includes(teamNumber)) {
    return fail("Alteração de time inválida.");
  }

  const organization = await getCurrentOrganizationForUser();
  const supabase = await createClient();

  const { data: player, error: lookupError } = await supabase
    .from("game_players")
    .select("id,source,guest_confirmation_id,player_id")
    .eq("id", rosterId)
    .eq("game_id", gameId)
    .eq("organization_id", organization.id)
    .eq("attendance_status", "confirmed")
    .maybeSingle();

  if (lookupError || !player) return fail("Jogador não encontrado neste jogo.");

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("status")
    .eq("id", gameId)
    .eq("organization_id", organization.id)
    .maybeSingle();

  if (gameError || !game) return fail("Jogo não encontrado.");
  if (game.status !== "scheduled") return fail("Os times de um jogo encerrado ou cancelado não podem ser alterados.");

  const { error } = await supabase
    .from("game_players")
    .update({ team_number: teamNumber, updated_at: new Date().toISOString() })
    .eq("id", rosterId)
    .eq("organization_id", organization.id)
    .eq("game_id", gameId);

  if (error) return fail("Não foi possível mover o jogador de time.");

  if (player.source === "guest" && player.guest_confirmation_id) {
    await supabase
      .from("game_guest_confirmations")
      .update({ team_number: teamNumber, updated_at: new Date().toISOString() })
      .eq("id", player.guest_confirmation_id)
      .eq("organization_id", organization.id)
      .eq("game_id", gameId);
  }

  if (player.player_id) {
    await supabase
      .from("game_attendances")
      .update({ team_number: teamNumber, updated_at: new Date().toISOString() })
      .eq("player_id", player.player_id)
      .eq("organization_id", organization.id)
      .eq("game_id", gameId);
  }

  revalidatePath(`/jogos/${gameId}`);
  revalidatePath("/meu-grupo");

  return { ok: true, message: `Jogador movido para o Time ${teamNumber}.` };
}


export async function completeGame(
  previous: GameActionState,
  formData: FormData
): Promise<GameActionState> {
  const gameId = String(formData.get("game_id") ?? "");
  if (!gameId) return fail("Jogo inválido.");

  const organization = await getCurrentOrganizationForUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("games")
    .update({ status: "completed", updated_at: new Date().toISOString() })
    .eq("id", gameId)
    .eq("organization_id", organization.id)
    .eq("status", "scheduled")
    .select("id")
    .maybeSingle();

  if (error || !data) return fail("Não foi possível encerrar o jogo.");

  revalidatePath(`/jogos/${gameId}`);
  revalidatePath("/jogos");
  revalidatePath("/dashboard");
  revalidatePath("/financeiro");
  revalidatePath("/meu-grupo");

  return { ok: true, message: "Jogo encerrado. Presenças e times ficaram bloqueados." };
}

export async function cancelGame(
  previous: GameActionState,
  formData: FormData
): Promise<GameActionState> {
  const gameId = String(formData.get("game_id") ?? "");
  if (!gameId) return fail("Jogo inválido.");

  const organization = await getCurrentOrganizationForUser();
  const supabase = await createClient();

  const { count: paidCount } = await supabase
    .from("game_players")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organization.id)
    .eq("game_id", gameId)
    .eq("payment_status", "paid");

  if ((paidCount ?? 0) > 0) {
    return fail("Há pagamentos registrados neste jogo. Resolva esses pagamentos antes de cancelar.");
  }

  const { data, error } = await supabase
    .from("games")
    .update({
      status: "canceled",
      public_invite_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", gameId)
    .eq("organization_id", organization.id)
    .eq("status", "scheduled")
    .select("id")
    .maybeSingle();

  if (error || !data) return fail("Não foi possível cancelar o jogo.");

  await Promise.all([
    supabase
      .from("game_charges")
      .delete()
      .eq("organization_id", organization.id)
      .eq("game_id", gameId)
      .eq("status", "pending"),
    supabase
      .from("game_players")
      .update({
        amount: 0,
        payment_status: "not_required",
        team_number: null,
        updated_at: new Date().toISOString(),
      })
      .eq("organization_id", organization.id)
      .eq("game_id", gameId)
      .neq("payment_status", "paid"),
    supabase
      .from("game_attendances")
      .update({ team_number: null, updated_at: new Date().toISOString() })
      .eq("organization_id", organization.id)
      .eq("game_id", gameId),
    supabase
      .from("game_guest_confirmations")
      .update({ team_number: null, updated_at: new Date().toISOString() })
      .eq("organization_id", organization.id)
      .eq("game_id", gameId),
  ]);

  revalidatePath(`/jogos/${gameId}`);
  revalidatePath("/jogos");
  revalidatePath("/dashboard");
  revalidatePath("/financeiro");
  revalidatePath("/meu-grupo");

  return { ok: true, message: "Jogo cancelado. Cobranças pendentes foram removidas." };
}
