import { createClient } from "@/lib/supabase/server";
import type { PlayerInvite,PublicInvite } from "@/types/invites";
export async function listPlayerInvites(org:string):Promise<PlayerInvite[]>{const s=await createClient();const{data,error}=await s.from("player_invites").select("*").eq("organization_id",org).order("created_at",{ascending:false});if(error)throw new Error("Não foi possível carregar os convites.");return(data??[]) as PlayerInvite[];}
export async function getPublicInvite(token:string):Promise<PublicInvite|null>{const s=await createClient();const{data,error}=await s.rpc("get_player_invite",{_token:token});if(error||!data?.length)return null;return data[0] as PublicInvite;}
