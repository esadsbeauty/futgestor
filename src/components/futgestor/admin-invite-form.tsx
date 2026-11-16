"use client";

import { CheckCircle2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import {
  acceptAdminInvite,
  type AdminInviteActionState,
} from "@/lib/mutations/admin-invites";

const initialState: AdminInviteActionState = { ok: false };

export function AdminInviteForm({
  token,
  organizationName,
  email,
}: {
  token: string;
  organizationName: string;
  email: string;
}) {
  const [state, action, pending] = useActionState(acceptAdminInvite, initialState);
  const [copied, setCopied] = useState(false);

  async function copyPassword() {
    if (!state.temporaryPassword) return;
    await navigator.clipboard.writeText(state.temporaryPassword);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  if (state.ok) {
    return (
      <div className="text-center">
        <CheckCircle2 className="mx-auto size-14 text-[var(--success)]" />
        <h1 className="mt-5 text-3xl font-black">Acesso administrativo criado!</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">{state.message}</p>
        {state.temporaryPassword ? (
          <div className="mt-6 rounded-2xl border border-[var(--success)]/20 bg-[var(--success)]/5 p-4 text-left">
            <p className="text-xs text-[var(--muted)]">E-mail</p>
            <p className="mt-1 break-all text-sm font-bold">{state.email ?? email}</p>
            <p className="mt-4 text-xs text-[var(--muted)]">Senha temporária</p>
            <div className="mt-1 flex items-center justify-between gap-3 rounded-xl bg-black/20 px-3 py-3">
              <code className="break-all text-sm font-black text-white">{state.temporaryPassword}</code>
              <button
                type="button"
                onClick={copyPassword}
                className="focus-ring shrink-0 rounded-lg px-2 py-1 text-xs font-bold text-[var(--brand)]"
              >
                {copied ? "Copiado!" : "Copiar"}
              </button>
            </div>
          </div>
        ) : null}
        <Link
          href="/login"
          className="focus-ring mt-7 inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--brand)] px-6 font-bold text-[#01111d]"
        >
          Entrar no FutGestor
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="text-center">
        <ShieldCheck className="mx-auto size-12 text-[var(--brand)]" />
        <p className="mt-5 text-[10px] font-bold uppercase tracking-[.22em] text-[var(--brand)]">
          Convite de administrador
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">
          Administrar {organizationName}
        </h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Crie sua conta para acessar o painel administrativo desta organização.
        </p>
      </div>

      <form action={action} className="mt-8 space-y-5">
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="email" value={email} />
        <label className="block">
          <span className="text-sm font-medium">Nome</span>
          <input
            name="name"
            required
            minLength={2}
            autoComplete="name"
            className="input"
            placeholder="Seu nome"
          />
          {state.fieldErrors?.name?.[0] ? (
            <small className="mt-1 block text-[var(--danger)]">{state.fieldErrors.name[0]}</small>
          ) : null}
        </label>

        <label className="block">
          <span className="text-sm font-medium">E-mail</span>
          <input value={email} readOnly className="input cursor-not-allowed opacity-70" />
        </label>

        {state.message ? (
          <p role="alert" className="text-sm text-[var(--danger)]">{state.message}</p>
        ) : null}

        <button
          disabled={pending}
          className="focus-ring min-h-12 w-full rounded-xl bg-[var(--brand)] px-5 font-bold text-[#01111d] disabled:opacity-60"
        >
          {pending ? "Criando acesso..." : "Ativar acesso de administrador"}
        </button>
      </form>
    </>
  );
}
