"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentOrganizationForUser } from "@/lib/queries/participants";
import { createClient } from "@/lib/supabase/server";
import { gameEventSchema,gameExpenseSchema,gamePlayersSchema,gameSchema } from "@/lib/validators/games";

export type GameActionState={ok:boolean;message?:string;fieldErrors?:Record<string,string[]|undefined>};
const fail=(message:string):GameActionState=>({ok:false,message});
const payload=(f:FormData)=>({title:f.get("title"),game_date:f.get("game_date"),start_time:f.get("start_time")??"",location:f.get("location")??"",player_price:f.get("player_price"),notes:f.get("notes")??"",status:f.get("status")??"scheduled"});
export async function createGame(_:GameActionState,f:FormData):Promise<GameActionState>{const p=gameSchema.safeParse(payload(f));if(!p.success)return{ok:false,message:"Revise os campos.",fieldErrors:p.error.flatten().fieldErrors};let id:string|undefined;try{const o=await getCurrentOrganizationForUser();const s=await createClient();const{data,error}=await s.from("games").insert({...p.data,start_time:p.data.start_time||null,organization_id:o.id,created_by:(await s.auth.getUser()).data.user!.id}).select("id").single();if(error)return fail("Não foi possível criar o jogo.");id=data.id;}catch{return fail("Não foi possível criar o jogo.");}redirect(`/jogos/${id}`);}
export async function updateGame(_:GameActionState,f:FormData):Promise<GameActionState>{const id=String(f.get("game_id")??"");const p=gameSchema.safeParse(payload(f));if(!p.success)return{ok:false,message:"Revise os campos.",fieldErrors:p.error.flatten().fieldErrors};const o=await getCurrentOrganizationForUser();const s=await createClient();const{data,error}=await s.from("games").update({...p.data,start_time:p.data.start_time||null,updated_at:new Date().toISOString()}).eq("id",id).eq("organization_id",o.id).select("id").maybeSingle();if(error||!data)return fail("Não foi possível atualizar o jogo.");revalidatePath(`/jogos/${id}`);revalidatePath("/jogos");return{ok:true,message:"Jogo atualizado."};}
export async function addPlayersToGame(_:GameActionState,f:FormData):Promise<GameActionState>{const game=String(f.get("game_id")??"");const p=gamePlayersSchema.safeParse({player_ids:f.getAll("player_ids")});if(!p.success)return fail("Selecione ao menos um jogador.");const o=await getCurrentOrganizationForUser();const s=await createClient();const[{data:g},{data:players}]=await Promise.all([s.from("games").select("id,player_price").eq("id",game).eq("organization_id",o.id).maybeSingle(),s.from("players").select("id,billing_type").eq("organization_id",o.id).eq("status","active").in("id",p.data.player_ids)]);if(!g||!players)return fail("Jogo ou jogadores inválidos.");const allowed=players.filter(x=>o.billing_mode!=="hybrid"||x.billing_type==="per_game");if(!allowed.length)return fail("Nenhum jogador elegível foi selecionado.");const{error}=await s.from("game_charges").upsert(allowed.map(x=>({organization_id:o.id,game_id:game,player_id:x.id,amount:g.player_price})),{onConflict:"game_id,player_id",ignoreDuplicates:true});if(error)return fail("Não foi possível adicionar os jogadores.");revalidatePath(`/jogos/${game}`);return{ok:true,message:"Jogadores adicionados."};}
export async function removePendingGameCharge(f:FormData){const id=String(f.get("charge_id"));const game=String(f.get("game_id"));const o=await getCurrentOrganizationForUser();const s=await createClient();await s.from("game_charges").delete().eq("id",id).eq("game_id",game).eq("organization_id",o.id).eq("status","pending");revalidatePath(`/jogos/${game}`);}
export async function payGameCharge(f:FormData){const id=String(f.get("charge_id"));const game=String(f.get("game_id"));const o=await getCurrentOrganizationForUser();const s=await createClient();const{data}=await s.from("game_charges").select("id").eq("id",id).eq("game_id",game).eq("organization_id",o.id).maybeSingle();if(data)await s.rpc("mark_game_charge_paid",{_charge:id});revalidatePath(`/jogos/${game}`);revalidatePath("/financeiro");}
export async function createGameExpense(_:GameActionState,f:FormData):Promise<GameActionState>{const game=String(f.get("game_id"));const p=gameExpenseSchema.safeParse({description:f.get("description"),category:f.get("category"),amount:f.get("amount")});if(!p.success)return{ok:false,message:"Revise os campos.",fieldErrors:p.error.flatten().fieldErrors};const o=await getCurrentOrganizationForUser();const s=await createClient();const{data:g}=await s.from("games").select("id").eq("id",game).eq("organization_id",o.id).maybeSingle();if(!g)return fail("Jogo inválido.");const{error}=await s.from("game_expenses").insert({...p.data,organization_id:o.id,game_id:game});if(error)return fail("Não foi possível adicionar a despesa.");revalidatePath(`/jogos/${game}`);return{ok:true,message:"Despesa adicionada."};}
export async function payGameExpense(f:FormData){const id=String(f.get("expense_id"));const game=String(f.get("game_id"));const o=await getCurrentOrganizationForUser();const s=await createClient();const{data}=await s.from("game_expenses").select("id").eq("id",id).eq("game_id",game).eq("organization_id",o.id).maybeSingle();if(data)await s.rpc("mark_game_expense_paid",{_expense:id});revalidatePath(`/jogos/${game}`);revalidatePath("/financeiro");}


export async function createGameEvent(
  _: GameActionState,
  formData: FormData
): Promise<GameActionState> {
  const gameId = String(formData.get("game_id") ?? "");
  const parsed = gameEventSchema.safeParse({
    player_id: formData.get("player_id"),
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
    supabase
      .from("players")
      .select("id")
      .eq("id", parsed.data.player_id)
      .eq("organization_id", organization.id)
      .maybeSingle(),
    supabase.auth.getUser(),
  ]);

  if (!game || !player || !user) {
    return fail("Jogo ou participante inválido.");
  }

  const { error } = await supabase.from("game_events").insert({
    organization_id: organization.id,
    game_id: gameId,
    player_id: player.id,
    event_type: parsed.data.event_type,
    quantity: parsed.data.quantity,
    created_by: user.id,
  });

  if (error) return fail("Não foi possível registrar o destaque.");

  revalidatePath(`/jogos/${gameId}`);
  return { ok: true, message: "Destaque registrado." };
}

export async function removeGameEvent(formData: FormData) {
  const eventId = String(formData.get("event_id") ?? "");
  const gameId = String(formData.get("game_id") ?? "");
  const organization = await getCurrentOrganizationForUser();
  const supabase = await createClient();

  await supabase
    .from("game_events")
    .delete()
    .eq("id", eventId)
    .eq("game_id", gameId)
    .eq("organization_id", organization.id);

  revalidatePath(`/jogos/${gameId}`);
}
