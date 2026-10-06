"use client";

import { CircleCheck, CircleX, X } from "lucide-react";
import { useEffect, useState } from "react";

export function ActionToast({ message, success, resetKey }: { message?: string; success: boolean; resetKey?: number }) {
  const [visible, setVisible] = useState(Boolean(message));
  useEffect(() => {
    setVisible(Boolean(message));
    if (!message) return;
    const timer = window.setTimeout(() => setVisible(false), 4500);
    return () => window.clearTimeout(timer);
  }, [message, resetKey]);
  if (!message || !visible) return null;
  const Icon = success ? CircleCheck : CircleX;
  return (
    <div role="status" className="fixed bottom-24 right-4 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3 text-sm shadow-2xl md:bottom-6">
      <Icon size={19} className={success ? "text-[var(--brand)]" : "text-[var(--danger)]"} />
      <span>{message}</span>
      <button type="button" aria-label="Fechar aviso" onClick={() => setVisible(false)} className="focus-ring ml-1 rounded-lg p-1 text-[var(--muted)]"><X size={16} /></button>
    </div>
  );
}
