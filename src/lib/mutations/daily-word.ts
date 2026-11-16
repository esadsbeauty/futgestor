"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrganizationForUser } from "@/lib/queries/participants";

export async function saveDailyWord(_: {ok:boolean;message:string}, formData: FormData) {
  try {
    const month=String(formData.get("month")??"");
    const day=String(formData.get("day")??"");
    const reference=String(formData.get("reference")??"").trim();
    const title=String(formData.get("title")??"").trim();
    const reflection=String(formData.get("reflection")??"").trim();
    const monthNum=Number(month), dayNum=Number(day);
    const test = new Date(Date.UTC(2024,monthNum-1,dayNum));
    if (!Number.isInteger(monthNum)||!Number.isInteger(dayNum)||test.getUTCMonth()!==monthNum-1||test.getUTCDate()!==dayNum)
      return {ok:false,message:"Selecione uma data válida."};
    if(reference.length<2||reference.length>100||title.length<2||title.length>120||reflection.length<5||reflection.length>700)
      return {ok:false,message:"Preencha referência, título e reflexão respeitando os limites."};
    const organization=await getCurrentOrganizationForUser();
    const supabase=await createClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user) return {ok:false,message:"Faça login para continuar."};
    const {data:member}=await supabase.from("organization_members").select("role")
      .eq("organization_id",organization.id).eq("user_id",user.id).maybeSingle();
    if (!member || !["owner","admin"].includes(member.role))
      return {ok:false,message:"Somente administradores podem editar a Palavra do Dia."};
    const admin=createAdminClient();
    const day_key=`${month.padStart(2,"0")}-${day.padStart(2,"0")}`;
    const {error}=await admin.from("daily_word_overrides")
      .upsert({day_key,reference,title,reflection,updated_at:new Date().toISOString()});
    if(error) return {ok:false,message:"Não foi possível salvar a mensagem."};
    revalidatePath("/configuracoes");
    return {ok:true,message:`Mensagem especial salva para ${day_key}.`};
  } catch {
    return {ok:false,message:"Não foi possível salvar a mensagem."};
  }
}
