"use client";

import { Building2, CircleDollarSign, Clipboard, LockKeyhole, LogOut, ShieldCheck, Trash2, UserRound, UsersRound } from "lucide-react";
import { useActionState, useState } from "react";
import { createAdminInvite, deactivateAdminInvite, logout, removeOrganizationAdmin, updateBillingMode, updateFinancialSettings, updateFinancialTransparency, updateOrganizationSettings, updatePassword, updateProfile, type SettingsActionState } from "@/lib/mutations/settings";
import { ActionToast } from "@/components/ui/action-toast";
import { SettingsSection } from "@/components/futgestor/settings-section";
import type { AdminInvite, OrganizationAdmin, SettingsData } from "@/types/settings";
import type { BillingMode } from "@/types/billing";

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

const billingDescriptions: Record<BillingMode, string> = {
  monthly: "Os participantes pagam uma mensalidade fixa.",
  per_game: "Os participantes são cobrados pelos jogos em que participam.",
  hybrid: "Você pode ter mensalistas e jogadores que pagam por jogo.",
};

function BillingModeForm({ mode }: { mode: BillingMode }) {
  const [selected, setSelected] = useState(mode);
  const [state, action, pending] = useActionState(updateBillingMode, initialState);
  return <form action={action} className="space-y-4"><label className="block"><span className="text-sm font-medium">Modelo de cobrança</span><select name="billing_mode" value={selected} onChange={(event) => setSelected(event.target.value as BillingMode)} className="input"><option value="monthly">Mensal</option><option value="per_game">Por jogo</option><option value="hybrid">Mensal + avulsos</option></select><FieldError errors={state.fieldErrors?.billing_mode}/></label><p className="rounded-xl bg-white/[.04] p-3 text-xs leading-5 text-[var(--muted)]">{billingDescriptions[selected]}</p><FormFeedback state={state}/><SubmitButton pending={pending}>Salvar modelo de cobrança</SubmitButton></form>;
}


function TransparencyForm({
  showCash,
  showReceivables,
  showPayables,
  showPending,
  showIndividualValues,
}: {
  showCash: boolean;
  showReceivables: boolean;
  showPayables: boolean;
  showPending: boolean;
  showIndividualValues: boolean;
}) {
  const [state, action, pending] = useActionState(updateFinancialTransparency, initialState);
  const options = [
    { name: "show_cash_balance", label: "Mostrar saldo do caixa", defaultChecked: showCash },
    { name: "show_receivables", label: "Mostrar total a receber", defaultChecked: showReceivables },
    { name: "show_payables", label: "Mostrar total a pagar", defaultChecked: showPayables },
    { name: "show_pending_players", label: "Mostrar participantes pendentes", defaultChecked: showPending },
    { name: "show_individual_values", label: "Mostrar valores individuais das pendências", defaultChecked: showIndividualValues },
  ];

  return <form action={action} className="space-y-4"><div className="space-y-2">{options.map((option) => <label key={option.name} className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-white/[.025] p-3"><input type="checkbox" name={option.name} defaultChecked={option.defaultChecked} className="size-4"/><span className="text-sm font-medium">{option.label}</span></label>)}</div><p className="rounded-xl bg-white/[.04] p-3 text-xs leading-5 text-[var(--muted)]">Essas opções controlam somente o que os participantes podem visualizar na área deles. Eles não poderão editar informações financeiras.</p><FormFeedback state={state}/><SubmitButton pending={pending}>Salvar transparência</SubmitButton></form>;
}


function CopyAdminInviteButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const resolvedUrl = url.startsWith("http") ? url : `${window.location.origin}${url}`;
    await navigator.clipboard.writeText(resolvedUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return <button type="button" onClick={copy} className="focus-ring inline-flex min-h-9 items-center gap-2 rounded-xl border border-[var(--border)] bg-white/[.03] px-3 text-xs font-bold text-[var(--brand)]"><Clipboard size={14}/>{copied ? "Copiado!" : "Copiar link"}</button>;
}

function AdministratorsForm({
  admins,
  invites,
  appUrl,
}: {
  admins: OrganizationAdmin[];
  invites: AdminInvite[];
  appUrl: string;
}) {
  const [state, action, pending] = useActionState(createAdminInvite, initialState);
  const owner = admins.find((admin) => admin.role === "owner");
  const administratorList = admins.filter((admin) => admin.role === "admin");

  return <div className="space-y-6">
    <div className="space-y-3">
      {owner ? <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-white/[.025] p-4"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--brand)]/10 text-[var(--brand)]"><ShieldCheck size={18}/></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{owner.name}</p><p className="mt-0.5 truncate text-xs text-[var(--muted)]">{owner.email ?? "Sem e-mail"} · Proprietário</p></div></div> : null}
      {administratorList.map((admin) => <div key={admin.member_id} className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-white/[.025] p-4"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[.04] text-[var(--muted)]"><UserRound size={18}/></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{admin.name}</p><p className="mt-0.5 truncate text-xs text-[var(--muted)]">{admin.email ?? "Sem e-mail"} · Administrador</p></div><form action={removeOrganizationAdmin}><input type="hidden" name="member_id" value={admin.member_id}/><button className="focus-ring grid size-9 place-items-center rounded-xl border border-[var(--danger)]/25 bg-[var(--danger)]/10 text-[var(--danger)]" aria-label={`Remover ${admin.name} dos administradores`}><Trash2 size={15}/></button></form></div>)}
      {administratorList.length === 0 ? <p className="rounded-xl bg-white/[.04] p-3 text-sm text-[var(--muted)]">Nenhum administrador adicional cadastrado.</p> : null}
    </div>

    <div className="border-t border-[var(--border)] pt-6">
      <h3 className="font-semibold">Convidar administrador</h3>
      <p className="mt-1 text-sm leading-6 text-[var(--muted)]">O convite é válido por 7 dias. A pessoa criará a própria conta e entrará diretamente nesta organização.</p>
      <form action={action} className="mt-4 space-y-4">
        <input type="hidden" name="origin" value={typeof window === "undefined" ? "" : window.location.origin}/>
        <label className="block"><span className="text-sm font-medium">E-mail do administrador</span><input name="email" type="email" required autoComplete="email" className="input" placeholder="admin@email.com"/><FieldError errors={state.fieldErrors?.email}/></label>
        <FormFeedback state={state}/>
        {state.inviteUrl ? <div className="rounded-2xl border border-[var(--brand)]/20 bg-[var(--brand)]/5 p-4"><p className="text-xs font-bold uppercase tracking-[.14em] text-[var(--brand)]">Convite criado</p><p className="mt-2 break-all text-xs text-[var(--muted)]">{state.inviteUrl}</p><div className="mt-3"><CopyAdminInviteButton url={state.inviteUrl}/></div></div> : null}
        <SubmitButton pending={pending}>Gerar convite de administrador</SubmitButton>
      </form>
    </div>

    {invites.length ? <div className="border-t border-[var(--border)] pt-6"><h3 className="font-semibold">Convites pendentes</h3><div className="mt-3 space-y-3">{invites.map((invite) => { const path = `${appUrl || ""}/convite-admin/${invite.token}` || `/convite-admin/${invite.token}`; const expires = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "UTC" }).format(new Date(invite.expires_at)); return <div key={invite.id} className="rounded-2xl border border-[var(--border)] bg-white/[.025] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-bold">{invite.email}</p><p className="mt-1 text-xs text-[var(--muted)]">Expira em {expires}</p></div><div className="flex gap-2"><CopyAdminInviteButton url={path}/><form action={deactivateAdminInvite}><input type="hidden" name="invite_id" value={invite.id}/><button className="focus-ring min-h-9 rounded-xl border border-[var(--danger)]/25 bg-[var(--danger)]/10 px-3 text-xs font-bold text-[var(--danger)]">Cancelar</button></form></div></div></div>; })}</div></div> : null}
  </div>;
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
  return <div className="space-y-5">
    <SettingsSection id="grupo" title="Dados do grupo" description="Informações básicas que identificam o seu baba." icon={Building2}>
      <GroupForm name={data.organization.name}/>
    </SettingsSection>

    {data.currentRole === "owner" ? <SettingsSection id="administradores" title="Administradores" description="Escolha quem pode acessar e administrar esta organização." icon={UsersRound}>
      <AdministratorsForm admins={data.admins} invites={data.adminInvites} appUrl={data.appUrl}/>
    </SettingsSection> : null}

    <SettingsSection id="financeiro" title="Cobrança e mensalidade" description="Defina como o grupo cobra seus participantes." icon={CircleDollarSign}>
      <BillingModeForm mode={data.organization.billing_mode}/>
      <div className="my-7 border-t border-[var(--border)]"/>
      {data.organization.billing_mode === "per_game" ? <p className="rounded-xl border border-[var(--warning)]/20 bg-[var(--warning)]/10 p-4 text-sm leading-6">Este grupo cobra por jogo, então a mensalidade padrão não é utilizada.</p> : <FinancialDefaultsForm fee={data.organization.default_monthly_fee} dueDay={data.organization.default_due_day}/>}
      <div className="my-7 border-t border-[var(--border)]"/>
      <div>
        <h3 className="font-semibold">Transparência para participantes</h3>
        <p className="mt-1 mb-4 text-sm text-[var(--muted)]">Escolha quais informações financeiras ficam visíveis na área dos jogadores.</p>
        <TransparencyForm showCash={data.organization.show_cash_balance} showReceivables={data.organization.show_receivables} showPayables={data.organization.show_payables} showPending={data.organization.show_pending_players} showIndividualValues={data.organization.show_individual_values}/>
      </div>
    </SettingsSection>

    <SettingsSection id="perfil" title="Meu perfil" description="Mantenha o nome usado na sua conta atualizado." icon={UserRound}>
      <ProfileForm name={data.profile.name} email={data.profile.email}/>
    </SettingsSection>

    <SettingsSection id="seguranca" title="Segurança" description="Atualize sua senha ou encerre a sessão atual." icon={LockKeyhole}>
      <SecurityForm/>
    </SettingsSection>
  </div>;
}
