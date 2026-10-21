"use client";

import { Copy, KeyRound, Link2, RefreshCw, ShieldCheck, ShieldOff } from "lucide-react";
import { useActionState } from "react";
import {
  deactivatePlayerAccess,
  regeneratePlayerAccess,
  type PlayerAccessActionState,
} from "@/lib/mutations/player-portal";
import { formatDate } from "@/lib/formatters";
import type { PlayerAccessToken } from "@/types/player-portal";

const initialState: PlayerAccessActionState = { ok: false };

export function PlayerAccessCard({
  playerId,
  access,
  hasAccount,
}: {
  playerId: string;
  access: PlayerAccessToken | null;
  hasAccount: boolean;
}) {
  const [state, action, pending] = useActionState(
    regeneratePlayerAccess,
    initialState
  );

  const token = state.token ?? access?.token;

  const copy = () =>
    token &&
    navigator.clipboard.writeText(
      `${window.location.origin}/ativar-conta/${token}`
    );

  if (hasAccount) {
    return (
      <section className="card mt-5 p-5 sm:p-7">
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--success)]/10 text-[var(--success)]">
            <ShieldCheck size={21} />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[var(--success)]">
              Conta do participante
            </p>
            <h2 className="mt-2 text-xl font-black">Login pessoal ativo</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Este participante já possui conta própria e entra com e-mail e
              senha. O acesso não depende mais de link privado.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="card mt-5 p-5 sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[var(--brand)]">
            Conta do participante
          </p>
          <h2 className="mt-2 text-xl font-black">Ativar login pessoal</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Gere um link de ativação. O participante cria e-mail e senha e,
            depois disso, este link é desativado automaticamente.
          </p>
        </div>

        <span
          className={`w-fit rounded-full border px-3 py-1 text-xs font-bold ${
            token
              ? "border-[var(--warning)]/20 bg-[var(--warning)]/10 text-[var(--warning)]"
              : "border-white/10 bg-white/5 text-[var(--muted)]"
          }`}
        >
          {token ? "Aguardando ativação" : "Sem login"}
        </span>
      </div>

      {access ? (
        <div className="mt-5 grid gap-3 border-t border-[var(--border)] pt-5 text-sm sm:grid-cols-2">
          <p>
            <span className="text-[var(--muted)]">Link criado em</span>
            <br />
            {formatDate(access.created_at)}
          </p>
          <p>
            <span className="text-[var(--muted)]">Último acesso pelo link</span>
            <br />
            {access.last_used_at ? formatDate(access.last_used_at) : "Ainda não acessado"}
          </p>
        </div>
      ) : null}

      {state.message ? (
        <p
          className={`mt-4 text-sm ${
            state.ok ? "text-[var(--success)]" : "text-[var(--danger)]"
          }`}
        >
          {state.message}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        {token ? (
          <button
            onClick={copy}
            className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--brand)] px-4 font-bold text-[#01111d]"
          >
            <Copy size={17} />
            Copiar link de ativação
          </button>
        ) : null}

        <form action={action}>
          <input type="hidden" name="player_id" value={playerId} />
          <button
            disabled={pending}
            className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border)] bg-white/5 px-4 font-semibold"
          >
            {token ? <RefreshCw size={17} /> : <KeyRound size={17} />}
            {pending
              ? "Gerando..."
              : token
                ? "Gerar novo link"
                : "Gerar link de ativação"}
          </button>
        </form>

        {access ? (
          <form action={deactivatePlayerAccess}>
            <input type="hidden" name="player_id" value={playerId} />
            <button className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--danger)]/20 px-4 font-semibold text-[var(--danger)]">
              <ShieldOff size={17} />
              Desativar link
            </button>
          </form>
        ) : null}
      </div>

      {!token ? (
        <p className="mt-4 flex items-center gap-2 text-xs text-[var(--muted)]">
          <Link2 size={15} />
          Use esta opção para migrar participantes antigos para login com e-mail
          e senha.
        </p>
      ) : null}
    </section>
  );
}
