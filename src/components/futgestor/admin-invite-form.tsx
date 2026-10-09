"use client";

import { CheckCircle2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
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

  if (state.ok) {
    return (
      <div className="text-center">
        <CheckCircle2 className="mx-auto size-14 text-[var(--success)]" />
        <h1 className="mt-5 text-3xl font-black">Acesso administrativo criado!</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">{state.message}</p>
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
        <input
          type="hidden"
          name="origin"
          value={typeof window === "undefined" ? "" : window.location.origin}
        />

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

        <label className="block">
          <span className="text-sm font-medium">Senha</span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="input"
            placeholder="Mínimo de 8 caracteres"
          />
          {state.fieldErrors?.password?.[0] ? (
            <small className="mt-1 block text-[var(--danger)]">{state.fieldErrors.password[0]}</small>
          ) : null}
        </label>

        {state.message ? (
          <p role="alert" className="text-sm text-[var(--danger)]">{state.message}</p>
        ) : null}

        <button
          disabled={pending}
          className="focus-ring min-h-12 w-full rounded-xl bg-[var(--brand)] px-5 font-bold text-[#01111d] disabled:opacity-60"
        >
          {pending ? "Criando acesso..." : "Criar acesso de administrador"}
        </button>
      </form>
    </>
  );
}
