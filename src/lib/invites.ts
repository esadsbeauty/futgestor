import type { BillingMode,PlayerBillingType } from "@/types/billing";
export function effectiveInviteBillingType(mode:BillingMode,inviteType:PlayerBillingType|null){if(mode==="monthly")return"monthly";if(mode==="per_game")return"per_game";return inviteType;}
export function isInviteAvailable(invite:{active:boolean;expires_at:string|null;max_uses:number|null;uses_count:number},now=new Date()){return invite.active&&(!invite.expires_at||new Date(invite.expires_at)>now)&&(invite.max_uses===null||invite.uses_count<invite.max_uses);}
export function normalizeWhatsapp(value:string){return value.replace(/\D/g,"");}
