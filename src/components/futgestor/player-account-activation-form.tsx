"use client";

import { CheckCircle2, KeyRound } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import {
  activateExistingPlayerAccount,
  type PlayerActivationActionState,
} from "@/lib/mutations/player-account";

const initialState: PlayerActivationActionState = { ok: false };

export function PlayerAccountActivationForm({
  token,
  organizationName,
  playerName,
}: {
  token: string;
  organizationName: string;
  playerName: string;
}) {
  const [state, action, pending] = useActionState(
    activateExistingPlayerAccount,
    initialState
  );

  if (state.ok) {
    return (
      <div className="text-center">
        <CheckCircle2 className="mx-auto size-14 text-[var(--success)]" />
        <h1 className="mt-5 text-3xl font-black">Conta ativada!</h1>
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
        <KeyRound className="mx-auto size-12 text-[var(--brand)]" />
        <p className="mt-5 text-[10px] font-bold uppercase tracking-[.22em] text-[var(--brand)]">
          Ativação de conta
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">
          Olá, {playerName}
        </h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Crie seu login pessoal para acessar o {organizationName} sem depender
          deste link.
        </p>
      </div>

      <form action={action} className="mt-8 space-y-5">
        <input type="hidden" name="token" value={token} />
        <input
          type="hidden"
          name="origin"
          value={typeof window === "undefined" ? "" : window.location.origin}
        />

        <label className="block">
          <span>E-mail</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="input"
            placeholder="voce@email.com"
          />
          {state.fieldErrors?.email?.[0] ? (
            <small className="mt-1 block text-[var(--danger)]">
              {state.fieldErrors.email[0]}
            </small>
          ) : null}
        </label>

        <label className="block">
          <span>Senha</span>
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
            <small className="mt-1 block text-[var(--danger)]">
              {state.fieldErrors.password[0]}
            </small>
          ) : null}
        </label>

        {state.message ? (
          <p role="alert" className="text-sm text-[var(--danger)]">
            {state.message}
          </p>
        ) : null}

        <button
          disabled={pending}
          className="focus-ring min-h-12 w-full rounded-xl bg-[var(--brand)] px-5 font-bold text-[#01111d] disabled:opacity-60"
        >
          {pending ? "Ativando..." : "Criar meu login"}
        </button>
      </form>
    </>
  );
}
