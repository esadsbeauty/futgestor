"use client";

import { Plus, Search, Users } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { ParticipantCard } from "@/components/futgestor/participant-card";
import { ParticipantForm } from "@/components/futgestor/participant-form";
import type { Organization, ParticipantWithCurrentFee } from "@/types/participants";

type Filter = "all" | "paid" | "pending" | "overdue" | "inactive";
const filters: Array<{ value: Filter; label: string }> = [{ value: "all", label: "Todos" }, { value: "paid", label: "Pagos" }, { value: "pending", label: "Pendentes" }, { value: "overdue", label: "Atrasados" }, { value: "inactive", label: "Inativos" }];

export function ParticipantList({ organization, participants }: { organization: Organization; participants: ParticipantWithCurrentFee[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [formOpen, setFormOpen] = useState(false);
  const closeForm = useCallback(() => setFormOpen(false), []);
  const activeCount = participants.filter((participant) => participant.status === "active").length;
  const visible = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase("pt-BR");
    return participants.filter((participant) => {
      const matchesName = participant.name.toLocaleLowerCase("pt-BR").includes(normalized);
      const matchesFilter = filter === "all" || participant.financialStatus === filter;
      return matchesName && matchesFilter;
    });
  }, [filter, participants, search]);

  return (
    <div className="mx-auto max-w-5xl">
      <header className="flex items-start justify-between gap-4">
        <div><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Participantes</h1><p className="mt-2 text-sm text-[var(--muted)]">{activeCount} {activeCount === 1 ? "participante ativo" : "participantes ativos"}</p></div>
        <button onClick={() => setFormOpen(true)} className="focus-ring flex min-h-11 items-center gap-2 rounded-xl bg-[var(--brand)] px-3 font-bold text-[#07110d] sm:px-4"><Plus size={19}/><span className="hidden sm:inline">Adicionar</span></button>
      </header>
      {participants.length > 0 && <>
        <label className="relative mt-8 block"><span className="sr-only">Buscar participante</span><Search size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]"/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar participante" className="input mt-0 pl-12"/></label>
        <div aria-label="Filtrar participantes" className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-2 sm:mx-0 sm:px-0">{filters.map((item) => <button key={item.value} onClick={() => setFilter(item.value)} className={`focus-ring shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${filter === item.value ? "border-[var(--brand)] bg-[var(--brand)] text-[#07110d]" : "border-[var(--border)] bg-white/5 text-[var(--muted)] hover:text-white"}`}>{item.label}</button>)}</div>
      </>}
      <section className="mt-6 grid gap-3 lg:grid-cols-2">
        {visible.map((participant) => <ParticipantCard key={participant.id} participant={participant}/>) }
      </section>
      {participants.length === 0 && <div className="card mt-8 grid place-items-center px-5 py-14 text-center"><span className="grid size-14 place-items-center rounded-2xl bg-white/5 text-[var(--muted)]"><Users/></span><h2 className="mt-5 text-lg font-bold">Nenhum participante cadastrado ainda.</h2><p className="mt-2 text-sm text-[var(--muted)]">Adicione o primeiro participante para começar o controle das mensalidades.</p><button onClick={() => setFormOpen(true)} className="focus-ring mt-6 rounded-xl bg-[var(--brand)] px-5 py-3 font-bold text-[#07110d]">Adicionar primeiro participante</button></div>}
      {participants.length > 0 && visible.length === 0 && <div className="card mt-6 px-5 py-12 text-center text-[var(--muted)]">Nenhum participante encontrado neste filtro.</div>}
      <ParticipantForm open={formOpen} onClose={closeForm} organization={organization}/>
    </div>
  );
}
