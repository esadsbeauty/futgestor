"use client";

import { CircleCheck, CircleX, X } from "lucide-react";
import { useEffect, useState } from "react";

export function ActionToast({ message, success, resetKey }: { message?: string; success: boolean; resetKey?: number }) {
  if (!message) return null;
  return <ToastContent key={`${message}-${resetKey ?? 0}`} message={message} success={success}/>;
}

function ToastContent({ message, success }: { message: string; success: boolean }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 4500);
    return () => window.clearTimeout(timer);
  }, []);
  if (!visible) return null;
  const Icon = success ? CircleCheck : CircleX;
  return (
    <div role="status" className="fixed bottom-24 right-4 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3 text-sm shadow-2xl md:bottom-6">
      <Icon size={19} className={success ? "text-[var(--brand)]" : "text-[var(--danger)]"} />
      <span>{message}</span>
      <button type="button" aria-label="Fechar aviso" onClick={() => setVisible(false)} className="focus-ring ml-1 rounded-lg p-1 text-[var(--muted)]"><X size={16} /></button>
    </div>
  );
}
