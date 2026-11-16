"use client";

import { Check, Copy, Share2 } from "lucide-react";
import { useState } from "react";

const SITE_URL = "https://futgestor.esads.com.br";

export function ShareGameInvite({ inviteToken, gameTitle }: { inviteToken?: string | null; gameTitle: string }) {
  const [copied, setCopied] = useState(false);
  if (!inviteToken) return null;

  const inviteUrl = `${SITE_URL}/confirmar-jogo/${encodeURIComponent(inviteToken)}`;
  const message = `⚽ ${gameTitle}\nConfirme sua presença no FutGestor:\n${inviteUrl}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mt-5 border-t border-[var(--border)] pt-4">
      <p className="text-xs font-bold text-[var(--brand)]">Convide outros jogadores</p>
      <p className="mt-1 text-xs text-[var(--muted)]">Compartilhe o link deste jogo para que outros jogadores confirmem presença.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={copyInvite} className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border)] px-3 text-xs font-bold text-[var(--brand)]">
          {copied ? <Check size={16}/> : <Copy size={16}/>}
          {copied ? "Link copiado" : "Copiar link"}
        </button>
        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--brand)] px-3 text-xs font-bold text-[#01111d]">
          <Share2 size={16}/> Compartilhar no WhatsApp
        </a>
      </div>
    </div>
  );
}
