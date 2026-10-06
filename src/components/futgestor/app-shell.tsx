import Link from "next/link";
import { CircleDollarSign, House, Settings, Sparkles, Users } from "lucide-react";

const items = [
  { href: "/dashboard", label: "Início", icon: House },
  { href: "/participantes", label: "Participantes", icon: Users },
  { href: "/financeiro", label: "Financeiro", icon: CircleDollarSign },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto min-h-screen max-w-[1480px] md:grid md:grid-cols-[270px_1fr]">
    <aside className="relative hidden border-r border-[var(--border)] bg-[#061126]/55 p-7 backdrop-blur-xl md:flex md:flex-col">
      <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-[var(--brand)]/5 to-transparent"/>
      <Link href="/dashboard" className="focus-ring relative flex items-center gap-3 rounded-xl text-xl font-extrabold tracking-tight"><span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-strong)] text-sm font-black text-[#01111d] shadow-[0_0_28px_rgba(56,199,255,.28)]">FG</span><span>Fut<span className="text-[var(--brand)]">Gestor</span></span></Link>
      <p className="relative mt-10 px-3 text-[10px] font-bold uppercase tracking-[.22em] text-[var(--muted)]">Menu principal</p>
      <nav className="relative mt-3 space-y-2">{items.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="focus-ring group flex min-h-12 items-center gap-3 rounded-2xl border border-transparent px-4 text-sm font-semibold text-[var(--muted)] transition hover:border-[var(--border)] hover:bg-white/[.045] hover:text-white"><Icon size={19} className="transition group-hover:text-[var(--brand)]"/>{label}</Link>)}</nav>
      <div className="relative mt-auto rounded-2xl border border-[var(--border)] bg-white/[.025] p-4"><Sparkles size={17} className="text-[var(--brand)]"/><p className="mt-3 text-xs font-semibold leading-5 text-white">Seu baba organizado</p><p className="text-xs leading-5 text-[var(--muted)]">Dentro e fora de campo.</p></div>
    </aside>
    <main className="min-w-0 px-4 pb-28 pt-6 sm:px-8 md:px-10 md:pb-14 md:pt-9 lg:px-14">{children}</main>
    <nav className="fixed inset-x-3 bottom-3 z-20 flex justify-around rounded-[1.4rem] border border-[var(--border-strong)] bg-[#07142b]/90 p-2 shadow-[0_16px_50px_rgba(0,0,0,.55),0_0_30px_rgba(56,199,255,.08)] backdrop-blur-2xl md:hidden">{items.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="focus-ring flex min-w-16 flex-col items-center gap-1.5 rounded-xl px-2 py-2 text-[10px] font-semibold text-[var(--muted)] transition active:bg-white/10 active:text-[var(--brand)]"><Icon size={20}/>{label}</Link>)}</nav>
  </div>;
}
