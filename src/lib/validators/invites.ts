import { z } from "zod";
import { playerBillingTypeSchema } from "./billing";
export const createPlayerInviteSchema=z.object({billing_type:playerBillingTypeSchema.nullable(),expires_at:z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),z.literal(""),z.null()]).transform(v=>v?new Date(v).toISOString():null),max_uses:z.union([z.coerce.number().int().positive(),z.literal(""),z.null()]).transform(v=>v===""?null:v)});
export const acceptPlayerInviteSchema=z.object({name:z.string().trim().min(2,"Informe seu nome."),whatsapp:z.string().transform(v=>v.replace(/\D/g,"")).refine(v=>v.length>=10&&v.length<=13,"Informe um WhatsApp válido.")});
