import { UserPlus } from "lucide-react";
import Link from "next/link";

export function DashboardEmptyState() {
  return <section className="card mt-8 grid place-items-center px-6 py-16 text-center"><span className="grid size-16 place-items-center rounded-2xl bg-[var(--brand)]/10 text-[var(--brand)]"><UserPlus size={28}/></span><h2 className="mt-5 text-xl font-bold">Seu baba ainda não tem participantes cadastrados.</h2><p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">Adicione o primeiro participante para começar a acompanhar mensalidades e movimentações.</p><Link href="/participantes" className="focus-ring mt-6 rounded-xl bg-[var(--brand)] px-5 py-3 font-bold text-[#07110d]">Adicionar participante</Link></section>;
}
