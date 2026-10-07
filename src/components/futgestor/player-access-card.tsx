"use client";

import { Copy, Link2, RefreshCw, ShieldOff } from "lucide-react";
import { useActionState } from "react";
import { deactivatePlayerAccess, regeneratePlayerAccess, type PlayerAccessActionState } from "@/lib/mutations/player-portal";
import { formatDate } from "@/lib/formatters";
import type { PlayerAccessToken } from "@/types/player-portal";

const initialState: PlayerAccessActionState = { ok: false };

export function PlayerAccessCard({ playerId, access }: { playerId: string; access: PlayerAccessToken | null }) {
  const [state, action, pending] = useActionState(regeneratePlayerAccess, initialState);
  const token = state.token ?? access?.token;
  const copy = () => token && navigator.clipboard.writeText(`${window.location.origin}/meu-grupo/${token}`);
  return <section className="card mt-5 p-5 sm:p-7"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[var(--brand)]">Portal pessoal</p><h2 className="mt-2 text-xl font-black">Acesso do participante</h2><p className="mt-2 text-sm text-[var(--muted)]">Link privado para consultar os próximos jogos e informações do grupo.</p></div><span className={`w-fit rounded-full border px-3 py-1 text-xs font-bold ${token?"border-[var(--success)]/20 bg-[var(--success)]/10 text-[var(--success)]":"border-white/10 bg-white/5 text-[var(--muted)]"}`}>{token?"Ativo":"Sem acesso"}</span></div>{access&&<div className="mt-5 grid gap-3 border-t border-[var(--border)] pt-5 text-sm sm:grid-cols-2"><p><span className="text-[var(--muted)]">Criado em</span><br/>{formatDate(access.created_at)}</p><p><span className="text-[var(--muted)]">Último acesso</span><br/>{access.last_used_at?formatDate(access.last_used_at):"Ainda não acessado"}</p></div>}{state.message&&<p className={`mt-4 text-sm ${state.ok?"text-[var(--success)]":"text-[var(--danger)]"}`}>{state.message}</p>}<div className="mt-5 flex flex-wrap gap-2">{token&&<button onClick={copy} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--brand)] px-4 font-bold text-[#01111d]"><Copy size={17}/>Copiar link</button>}<form action={action}><input type="hidden" name="player_id" value={playerId}/><button disabled={pending} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border)] bg-white/5 px-4 font-semibold"><RefreshCw size={17}/>{pending?"Gerando...":token?"Regenerar link":"Gerar acesso"}</button></form>{access&&<form action={deactivatePlayerAccess}><input type="hidden" name="player_id" value={playerId}/><button className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--danger)]/20 px-4 font-semibold text-[var(--danger)]"><ShieldOff size={17}/>Desativar</button></form>}</div>{!token&&<p className="mt-4 flex items-center gap-2 text-xs text-[var(--muted)]"><Link2 size={15}/>Participantes antigos podem receber um acesso por este botão.</p>}</section>;
}
