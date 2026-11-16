import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { annualMessageForDate } from "@/lib/daily-messages";

export const dynamic = "force-dynamic";

export async function GET() {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bahia",year:"numeric",month:"2-digit",day:"2-digit",
  }).formatToParts(new Date());
  const parts = Object.fromEntries(date.map(p=>[p.type,p.value]));
  const day = `${parts.year}-${parts.month}-${parts.day}`;
  const dayKey = day.slice(5);
  const supabase = await createClient();
  const { data, error } = await supabase.from("daily_word_overrides")
    .select("reference,title,reflection").eq("day_key",dayKey).maybeSingle();
  const message = (!error && data) ? data : annualMessageForDate(day);
  return NextResponse.json({ date: day, message }, {headers: {"Cache-Control":"no-store"}});
}
