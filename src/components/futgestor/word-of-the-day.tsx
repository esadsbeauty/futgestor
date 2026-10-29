"use client";

import { useEffect, useState } from "react";
import { BookOpen, X } from "lucide-react";

// Referências bíblicas com reflexões originais, sem reproduzir tradução protegida.
const messages = [
  { reference: "Provérbios 16:3", title: "Entregue seus planos", reflection: "Apresente seus projetos a Deus e faça sua parte com dedicação e responsabilidade." },
  { reference: "Salmos 133:1", title: "Valorize a união", reflection: "A convivência em harmonia fortalece o grupo dentro e fora da quadra." },
  { reference: "Filipenses 4:13", title: "Força para prosseguir", reflection: "Nos momentos difíceis, lembre-se de buscar força e perseverança na fé." },
  { reference: "Gálatas 6:9", title: "Não desista de fazer o bem", reflection: "Cada atitude de respeito e generosidade importa, mesmo quando ninguém está olhando." },
  { reference: "Provérbios 27:17", title: "Crescemos juntos", reflection: "Companheiros se ajudam a melhorar no esporte, e amizades verdadeiras nos fazem crescer." },
  { reference: "Colossenses 3:23", title: "Dê o seu melhor", reflection: "Faça cada tarefa com dedicação, respeito e um coração disposto." },
  { reference: "Josué 1:9", title: "Coragem e fé", reflection: "Tenha coragem diante dos desafios e mantenha a confiança em Deus." },
];

function localBahiaDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bahia", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function WordOfTheDay() {
  const [date, setDate] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const refresh = () => {
      const today = localBahiaDate();
      setDate(today);
      try { setDismissed(window.localStorage.getItem("futgestor-word-dismissed") === today); }
      catch { setDismissed(false); }
    };
    refresh();
    const id = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(id);
  }, []);

  if (!date || dismissed) return null;
  const day = Math.floor(Date.parse(`${date}T12:00:00Z`) / 86400000);
  const message = messages[((day % messages.length) + messages.length) % messages.length];

  const close = () => {
    try { window.localStorage.setItem("futgestor-word-dismissed", date); } catch { /* storage may be disabled */ }
    setDismissed(true);
  };

  return <aside role="complementary" aria-label="Palavra do Dia"
    className="fixed bottom-28 left-1/2 z-40 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-[var(--brand)]/35 bg-[#10233c]/95 p-4 shadow-[0_12px_45px_rgba(0,0,0,.6)] backdrop-blur-xl md:bottom-6">
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-[var(--brand)]">
        <BookOpen size={17} /> Palavra do Dia
      </div>
      <button type="button" aria-label="Fechar Palavra do Dia até amanhã" title="Não mostrar mais hoje"
        onClick={close} className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/15 text-white/75 hover:text-white">
        <X size={18}/>
      </button>
    </div>
    <p className="mt-2 text-sm font-bold text-white">{message.title}</p>
    <p className="mt-1 text-xs font-semibold text-amber-300">{message.reference}</p>
    <p className="mt-2 text-sm leading-6 text-slate-200">{message.reflection}</p>
  </aside>;
}
