import { Info } from "lucide-react";

export function BillingModeNotice({ compact = false }: { compact?: boolean }) {
  return <section className={`card flex items-start gap-3 ${compact ? "p-4" : "mt-8 p-5 sm:p-6"}`}><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--brand)]/10 text-[var(--brand)]"><Info size={18}/></span><div><h2 className="font-bold">Cobrança por jogo</h2><p className="mt-1 text-sm leading-6 text-[var(--muted)]">Este grupo utiliza cobrança por jogo. O controle de cobranças por partida será disponibilizado em uma etapa futura.</p></div></section>;
}
