import type { LucideIcon } from "lucide-react";

export function SettingsSection({ id, title, description, icon: Icon, children }: { id: string; title: string; description: string; icon: LucideIcon; children: React.ReactNode }) {
  return <section id={id} className="card scroll-mt-6 p-5 sm:p-7"><header className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-[var(--brand)]/15 bg-[var(--brand)]/10 text-[var(--brand)] shadow-[0_0_22px_rgba(56,199,255,.08)]"><Icon size={20}/></span><div><p className="text-[9px] font-bold uppercase tracking-[.17em] text-[var(--brand)]">Configuração</p><h2 className="mt-1 text-xl font-extrabold">{title}</h2><p className="mt-1 text-sm leading-6 text-[var(--muted)]">{description}</p></div></header><div className="mt-7 max-w-xl">{children}</div></section>;
}
