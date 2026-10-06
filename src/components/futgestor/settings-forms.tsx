"use client";

import { Building2, CircleDollarSign, LockKeyhole, LogOut, UserRound } from "lucide-react";
import { useActionState } from "react";
import { logout, updateFinancialSettings, updateOrganizationSettings, updatePassword, updateProfile, type SettingsActionState } from "@/lib/mutations/settings";
import { ActionToast } from "@/components/ui/action-toast";
import { SettingsSection } from "@/components/futgestor/settings-section";
import type { SettingsData } from "@/types/settings";

const initialState: SettingsActionState = { ok: false, revision: 0 };
function FieldError({ errors }: { errors?: string[] }) { return errors?.[0] ? <span className="mt-1 block text-xs text-[var(--danger)]">{errors[0]}</span> : null; }
function SubmitButton({ pending, children }: { pending: boolean; children: React.ReactNode }) { return <button disabled={pending} className="focus-ring min-h-11 rounded-xl bg-[var(--brand)] px-5 font-bold text-[#07110d] disabled:opacity-60">{pending ? "Salvando..." : children}</button>; }
function FormFeedback({ state }: { state: SettingsActionState }) { return <><ActionToast message={state.message} success={state.ok} resetKey={state.revision}/>{state.message && !state.ok && <p role="alert" className="text-sm text-[var(--danger)]">{state.message}</p>}</>; }

function GroupForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState(updateOrganizationSettings, initialState);
  return <form action={action} className="space-y-5"><label className="block"><span className="text-sm font-medium">Nome da organização</span><input name="name" required defaultValue={name} className="input"/><FieldError errors={state.fieldErrors?.name}/></label><FormFeedback state={state}/><SubmitButton pending={pending}>Salvar dados do grupo</SubmitButton></form>;
}

function FinancialDefaultsForm({ fee, dueDay }: { fee: number; dueDay: number }) {
  const [state, action, pending] = useActionState(updateFinancialSettings, initialState);
  return <form action={action} className="space-y-5"><div className="grid gap-5 sm:grid-cols-2"><label><span className="text-sm font-medium">Mensalidade padrão</span><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[var(--muted)]">R$</span><input name="default_monthly_fee" required type="number" min="0.01" step="0.01" inputMode="decimal" defaultValue={fee} className="input pl-12"/></div><FieldError errors={state.fieldErrors?.default_monthly_fee}/></label><label><span className="text-sm font-medium">Dia do vencimento</span><input name="default_due_day" required type="number" min="1" max="31" inputMode="numeric" defaultValue={dueDay} className="input"/><FieldError errors={state.fieldErrors?.default_due_day}/></label></div><p className="rounded-xl bg-white/[.04] p-3 text-xs leading-5 text-[var(--muted)]">Esses valores serão usados como padrão para novos participantes. Mensalidades e históricos existentes não serão alterados.</p><FormFeedback state={state}/><SubmitButton pending={pending}>Salvar padrões financeiros</SubmitButton></form>;
}

function ProfileForm({ name, email }: { name: string; email: string | null }) {
  const [state, action, pending] = useActionState(updateProfile, initialState);
  return <form action={action} className="space-y-5"><label className="block"><span className="text-sm font-medium">Nome</span><input name="name" required defaultValue={name} autoComplete="name" className="input"/><FieldError errors={state.fieldErrors?.name}/></label><label className="block"><span className="text-sm font-medium">E-mail</span><input value={email ?? ""} readOnly type="email" className="input cursor-not-allowed opacity-70"/><span className="mt-1.5 block text-xs text-[var(--muted)]">A troca de e-mail não está disponível nesta etapa.</span></label><FormFeedback state={state}/><SubmitButton pending={pending}>Salvar perfil</SubmitButton></form>;
}

function SecurityForm() {
  const [state, action, pending] = useActionState(updatePassword, initialState);
  return <div><form action={action} className="space-y-5"><div className="grid gap-5 sm:grid-cols-2"><label><span className="text-sm font-medium">Nova senha</span><input name="password" required type="password" minLength={8} autoComplete="new-password" className="input"/><FieldError errors={state.fieldErrors?.password}/></label><label><span className="text-sm font-medium">Confirmar nova senha</span><input name="passwordConfirmation" required type="password" minLength={8} autoComplete="new-password" className="input"/><FieldError errors={state.fieldErrors?.passwordConfirmation}/></label></div><FormFeedback state={state}/><SubmitButton pending={pending}>Alterar senha</SubmitButton></form><div className="mt-8 border-t border-[var(--border)] pt-6"><h3 className="font-semibold">Sessão</h3><p className="mt-1 text-sm text-[var(--muted)]">Encerre sua sessão neste dispositivo.</p><form action={logout} className="mt-4"><button className="focus-ring flex min-h-11 items-center gap-2 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-4 font-semibold text-[var(--danger)]"><LogOut size={18}/>Sair da conta</button></form></div></div>;
}

export function SettingsForms({ data }: { data: SettingsData }) {
  return <div className="space-y-5"><SettingsSection id="grupo" title="Dados do grupo" description="Informações básicas que identificam o seu baba." icon={Building2}><GroupForm name={data.organization.name}/></SettingsSection><SettingsSection id="financeiro" title="Mensalidade padrão" description="Defina os valores sugeridos ao cadastrar novos participantes." icon={CircleDollarSign}><FinancialDefaultsForm fee={data.organization.default_monthly_fee} dueDay={data.organization.default_due_day}/></SettingsSection><SettingsSection id="perfil" title="Meu perfil" description="Mantenha o nome usado na sua conta atualizado." icon={UserRound}><ProfileForm name={data.profile.name} email={data.profile.email}/></SettingsSection><SettingsSection id="seguranca" title="Segurança" description="Atualize sua senha ou encerre a sessão atual." icon={LockKeyhole}><SecurityForm/></SettingsSection></div>;
}
