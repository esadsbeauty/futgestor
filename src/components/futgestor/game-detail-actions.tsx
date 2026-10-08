"use client";
import { useActionState,useState } from "react";
import { addPlayersToGame,createGameEvent,createGameExpense,updateGame,type GameActionState } from "@/lib/mutations/games";
import type { Game } from "@/types/games";
import type { Participant } from "@/types/participants";
const initial:GameActionState={ok:false};
export function AddPlayersForm({game,players}:{game:string;players:Participant[]}){const[state,action,pending]=useActionState(addPlayersToGame,initial);const[open,setOpen]=useState(false);return <div><button onClick={()=>setOpen(!open)} className="rounded-xl bg-[var(--brand)] px-4 py-3 font-bold text-[#01111d]">Adicionar jogadores</button>{open&&<form action={action} className="card mt-4 p-4"><input type="hidden" name="game_id" value={game}/><div className="max-h-64 space-y-2 overflow-auto">{players.length?players.map(p=><label key={p.id} className="flex items-center gap-3 rounded-xl border border-[var(--border)] p-3"><input type="checkbox" name="player_ids" value={p.id}/><span>{p.name}</span></label>):<p className="text-sm text-[var(--muted)]">Nenhum jogador elegível disponível.</p>}</div>{state.message&&<p className="mt-3 text-sm text-[var(--muted)]">{state.message}</p>}<button disabled={pending||!players.length} className="mt-4 rounded-xl bg-[var(--brand)] px-4 py-3 font-bold text-[#01111d]">{pending?"Adicionando...":"Adicionar selecionados"}</button></form>}</div>}
export function ExpenseForm({game}:{game:string}){const[state,action,pending]=useActionState(createGameExpense,initial);return <form action={action} className="card mt-4 grid gap-3 p-4 sm:grid-cols-3"><input type="hidden" name="game_id" value={game}/><label><span>Descrição</span><input name="description" placeholder="Aluguel da quadra" className="input" required/></label><label><span>Categoria</span><select name="category" className="input"><option value="rental">Aluguel</option><option value="referee">Arbitragem</option><option value="water">Água</option><option value="other">Outros</option></select></label><label><span>Valor</span><input name="amount" type="number" min="0.01" step="0.01" className="input" required/></label>{state.message&&<p className="text-sm text-[var(--muted)] sm:col-span-3">{state.message}</p>}<button disabled={pending} className="rounded-xl bg-[var(--brand)] px-4 py-3 font-bold text-[#01111d] sm:col-span-3">Adicionar despesa</button></form>}
export function EditGameForm({game}:{game:Game}){const[state,action,pending]=useActionState(updateGame,initial);const[open,setOpen]=useState(false);return <div><button onClick={()=>setOpen(!open)} className="rounded-xl border border-[var(--border)] bg-white/5 px-4 py-3 font-bold">Editar jogo</button>{open&&<form action={action} className="card mt-4 grid gap-3 p-5 sm:grid-cols-2"><input type="hidden" name="game_id" value={game.id}/><label><span>Título</span><input name="title" defaultValue={game.title} className="input"/></label><label><span>Status</span><select name="status" defaultValue={game.status} className="input"><option value="scheduled">Agendado</option><option value="completed">Concluído</option><option value="canceled">Cancelado</option></select></label><label><span>Data</span><input name="game_date" type="date" defaultValue={game.game_date} className="input"/></label><label><span>Horário</span><input name="start_time" type="time" defaultValue={game.start_time?.slice(0,5)??""} className="input"/></label><label><span>Local</span><input name="location" defaultValue={game.location??""} className="input"/></label><label><span>Valor por jogador</span><input name="player_price" type="number" step="0.01" defaultValue={game.player_price} className="input"/></label><label className="sm:col-span-2"><span>Observações</span><textarea name="notes" defaultValue={game.notes??""} className="input"/></label>{state.message&&<p className="text-sm text-[var(--muted)]">{state.message}</p>}<button disabled={pending} className="rounded-xl bg-[var(--brand)] px-4 py-3 font-bold text-[#01111d] sm:col-span-2">Salvar jogo</button></form>}</div>}


export function GameEventForm({
  game,
  players,
}: {
  game: string;
  players: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(createGameEvent, initial);

  return (
    <form action={action} className="card mt-4 grid gap-3 p-4 sm:grid-cols-4">
      <input type="hidden" name="game_id" value={game} />

      <label className="sm:col-span-2">
        <span>Participante</span>
        <select name="player_id" className="input" required defaultValue="">
          <option value="" disabled>
            Selecione
          </option>
          {players.map((player) => (
            <option key={player.id} value={player.id}>
              {player.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>Evento</span>
        <select name="event_type" className="input" defaultValue="goal">
          <option value="goal">Gol</option>
          <option value="yellow_card">Cartão amarelo</option>
          <option value="red_card">Cartão vermelho</option>
        </select>
      </label>

      <label>
        <span>Quantidade</span>
        <input
          name="quantity"
          type="number"
          min="1"
          max="20"
          defaultValue="1"
          className="input"
          required
        />
      </label>

      {state.message && (
        <p className="text-sm text-[var(--muted)] sm:col-span-4">
          {state.message}
        </p>
      )}

      <button
        disabled={pending || !players.length}
        className="rounded-xl bg-[var(--brand)] px-4 py-3 font-bold text-[#01111d] sm:col-span-4"
      >
        {pending ? "Registrando..." : "Registrar destaque"}
      </button>
    </form>
  );
}
