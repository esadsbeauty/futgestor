import { SettingsForms } from "@/components/futgestor/settings-forms";
import { getSettingsData } from "@/lib/queries/settings";

export const dynamic = "force-dynamic";

const sections = [{ href: "#grupo", label: "Grupo" }, { href: "#financeiro", label: "Financeiro" }, { href: "#perfil", label: "Meu perfil" }, { href: "#seguranca", label: "Segurança" }];

export default async function SettingsPage() {
  const data = await getSettingsData();
  return <div className="mx-auto max-w-5xl pb-8"><header><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Configurações</h1><p className="mt-2 text-sm text-[var(--muted)]">Gerencie os dados do seu grupo e da sua conta.</p></header><div className="mt-8 grid gap-6 lg:grid-cols-[190px_1fr]"><nav aria-label="Seções das configurações" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-2 lg:sticky lg:top-8 lg:mx-0 lg:block lg:self-start lg:px-0">{sections.map((section) => <a key={section.href} href={section.href} className="focus-ring block shrink-0 rounded-xl border border-[var(--border)] bg-white/5 px-4 py-3 text-sm font-semibold text-[var(--muted)] transition hover:bg-white/10 hover:text-white lg:mb-2">{section.label}</a>)}</nav><SettingsForms data={data}/></div></div>;
}
