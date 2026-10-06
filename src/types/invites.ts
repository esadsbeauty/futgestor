import type { PlayerBillingType } from "@/types/billing";
export type PlayerInvite={id:string;organization_id:string;token:string;billing_type:PlayerBillingType|null;active:boolean;expires_at:string|null;max_uses:number|null;uses_count:number;created_by:string;created_at:string;updated_at:string};
export type PublicInvite={organization_name:string;billing_type:PlayerBillingType|null;available:boolean};
