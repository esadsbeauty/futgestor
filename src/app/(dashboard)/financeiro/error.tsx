"use client";

export default function FinanceError({ reset }: { error: Error; reset: () => void }) {
  return <div className="card mx-auto max-w-2xl p-8 text-center"><h1 className="text-xl font-bold">Não foi possível carregar o financeiro</h1><p className="mt-2 text-sm text-[var(--muted)]">Verifique sua conexão e tente novamente.</p><button onClick={reset} className="focus-ring mt-6 rounded-xl bg-[var(--brand)] px-5 py-3 font-bold text-[#07110d]">Tentar novamente</button></div>;
}
