import type { LucideIcon } from "lucide-react";

export function SettingsSection({ id, title, description, icon: Icon, children }: { id: string; title: string; description: string; icon: LucideIcon; children: React.ReactNode }) {
  return <section id={id} className="card scroll-mt-6 p-5 sm:p-7"><header className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--brand)]/10 text-[var(--brand)]"><Icon size={20}/></span><div><h2 className="text-xl font-bold">{title}</h2><p className="mt-1 text-sm leading-6 text-[var(--muted)]">{description}</p></div></header><div className="mt-7 max-w-xl">{children}</div></section>;
}
