"use client";

import { useEffect, useState } from "react";
import { BookOpen, X } from "lucide-react";
import { annualMessageForDate } from "@/lib/daily-messages";

type DailyMessage = {reference:string;title:string;reflection:string};

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
  const [message, setMessage] = useState<DailyMessage | null>(null);

  useEffect(() => {
    let active = true;
    let currentDate = "";
    let requestCounter = 0;

    const refresh = async () => {
      const today = localBahiaDate();
      const dateChanged = today !== currentDate;
      currentDate = today;
      setDate(today);

      try {
        setDismissed(window.localStorage.getItem("futgestor-word-dismissed") === today);
      } catch {
        setDismissed(false);
      }

      // A mensagem local é específica do dia e aparece mesmo quando a API falha.
      if (dateChanged) setMessage(annualMessageForDate(today));

      const requestId = ++requestCounter;
      try {
        const response = await fetch(`/api/palavra-do-dia?dia=${today}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        if (!response.ok) return;
        const result = await response.json() as { date: string; message: DailyMessage };
        // Nunca exibir resposta antiga, inclusive após a virada do dia.
        if (active && requestId === requestCounter && result.date === today && result.message?.reference && result.message?.reflection) {
          setMessage(result.message);
        }
      } catch {
        // Mantém a mensagem diária local caso o visitante esteja sem conexão.
      }
    };

    void refresh();
    const id = window.setInterval(() => void refresh(), 60_000);
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (!date || dismissed || !message) return null;

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
