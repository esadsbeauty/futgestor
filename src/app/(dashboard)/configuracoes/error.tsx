"use client";

export default function SettingsError({ reset }: { error: Error; reset: () => void }) {
  return <div className="card mx-auto max-w-2xl p-8 text-center"><h1 className="text-xl font-bold">Não foi possível carregar as configurações</h1><p className="mt-2 text-sm text-[var(--muted)]">Tente novamente em alguns instantes.</p><button onClick={reset} className="focus-ring mt-6 rounded-xl bg-[var(--brand)] px-5 py-3 font-bold text-[#07110d]">Tentar novamente</button></div>;
}
