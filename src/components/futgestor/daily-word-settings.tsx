"use client";
import { useActionState } from "react";
import { saveDailyWord } from "@/lib/mutations/daily-word";
export function DailyWordSettings() {
  const [state, action, pending] = useActionState(saveDailyWord,{ok:false,message:""});
  return <section id="palavra-do-dia" className="card mt-8 p-5 sm:p-7">
    <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[var(--brand)]">Palavra do Dia</p>
    <h2 className="mt-2 text-lg font-black">Mensagem especial</h2>
    <p className="mt-2 text-sm text-[var(--muted)]">
      A biblioteca automática contém 365 reflexões anuais. Cadastre uma mensagem para uma data específica;
      ela substitui a automática nesse dia, todos os anos. Use uma referência bíblica e reflexão original.
    </p>
    <form action={action} className="mt-5 grid gap-3 sm:grid-cols-2">
      <label><span className="text-xs">Mês</span><select className="input mt-1" name="month" required defaultValue={String(new Date().getMonth()+1)}>
        {["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"].map((name,i)=><option key={i} value={i+1}>{name}</option>)}
      </select></label>
      <label><span className="text-xs">Dia</span><input className="input mt-1" type="number" name="day" min="1" max="31" required defaultValue={1}/></label>
      <label className="sm:col-span-2"><span className="text-xs">Referência bíblica</span><input name="reference" className="input mt-1" maxLength={100} required placeholder="Ex.: Salmos 23:1" /></label>
      <label className="sm:col-span-2"><span className="text-xs">Título</span><input name="title" className="input mt-1" maxLength={120} required placeholder="Ex.: Confiança em Deus"/></label>
      <label className="sm:col-span-2"><span className="text-xs">Reflexão</span><textarea name="reflection" className="input mt-1 min-h-28" maxLength={700} required placeholder="Escreva uma mensagem curta e acolhedora."/></label>
      {state.message && <p role="status" className={`sm:col-span-2 text-sm ${state.ok?"text-[var(--success)]":"text-[var(--danger)]"}`}>{state.message}</p>}
      <button disabled={pending} className="min-h-11 rounded-xl bg-[var(--brand)] px-5 font-bold text-[#01111d] disabled:opacity-50 sm:col-span-2">{pending?"Salvando...":"Salvar mensagem especial"}</button>
    </form>
  </section>;
}
