"use client";

import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { acceptPlayerInvite, type InviteActionState } from "@/lib/mutations/invites";

const initialState: InviteActionState = { ok: false };

export function InvitePublicForm({ token, organizationName }: { token: string; organizationName: string }) {
  const [state, action, pending] = useActionState(acceptPlayerInvite, initialState);

  if (state.ok) return <div className="text-center"><CheckCircle2 className="mx-auto size-14 text-[var(--success)]"/><h1 className="mt-5 text-3xl font-black">Você entrou no grupo!</h1><p className="mt-3 text-[var(--muted)]"><strong className="text-white">{state.playerName}</strong>, seu cadastro no {state.organizationName} foi realizado com sucesso.</p>{state.accessToken&&<Link href={`/meu-grupo/${state.accessToken}`} className="focus-ring mt-7 inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--brand)] px-6 font-bold text-[#01111d]">Acessar meu grupo</Link>}</div>;

  return <><div className="text-center"><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[var(--brand)]">Convite FutGestor</p><h1 className="mt-3 text-3xl font-black tracking-tight">Entrar no {organizationName}</h1><p className="mt-3 text-sm text-[var(--muted)]">Você foi convidado para fazer parte deste grupo.</p></div><form action={action} className="mt-8 space-y-5"><input type="hidden" name="token" value={token}/><label className="block"><span>Nome</span><input name="name" className="input" minLength={2} required autoComplete="name" placeholder="Seu nome completo"/>{state.fieldErrors?.name?.[0]&&<small className="mt-1 block text-[var(--danger)]">{state.fieldErrors.name[0]}</small>}</label><label className="block"><span>WhatsApp</span><input name="whatsapp" className="input" required inputMode="tel" autoComplete="tel" placeholder="(71) 99999-9999"/>{state.fieldErrors?.whatsapp?.[0]&&<small className="mt-1 block text-[var(--danger)]">{state.fieldErrors.whatsapp[0]}</small>}</label>{state.message&&<p role="alert" className="text-sm text-[var(--danger)]">{state.message}</p>}<button disabled={pending} className="focus-ring min-h-12 w-full rounded-xl bg-[var(--brand)] px-5 font-bold text-[#01111d] disabled:opacity-60">{pending?"Entrando...":"Entrar no grupo"}</button></form></>;
}
