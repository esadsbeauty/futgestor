import { CalendarDays, Link2Off, MapPin } from "lucide-react";
import { PublicGameConfirmationForm } from "@/components/futgestor/public-game-confirmation-form";
import { formatDate } from "@/lib/formatters";
import { getPublicGameInvite } from "@/lib/queries/games";
import type { GameFormat } from "@/types/games";

export const dynamic = "force-dynamic";

export default async function PublicGameInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const game = await getPublicGameInvite(token);

  if (!game) {
    return (
      <main className="grid min-h-screen place-items-center px-5 py-10">
        <section className="card glow-card w-full max-w-md p-7 text-center sm:p-9">
          <Link2Off className="mx-auto size-14 text-[var(--muted)]" />
          <h1 className="mt-5 text-2xl font-black">Este convite não está disponível.</h1>
          <p className="mt-3 text-sm text-[var(--muted)]">
            Peça ao responsável pelo jogo um novo link.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <section className="card glow-card w-full max-w-md p-7 sm:p-9">
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[var(--brand)]">
            Convite para o jogo
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight">{game.title}</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">{game.organization_name}</p>

          <div className="mt-5 space-y-2 rounded-2xl border border-[var(--border)] bg-white/[.025] p-4 text-left text-sm">
            <p className="flex items-center gap-2"><CalendarDays size={16} className="text-[var(--brand)]" />{formatDate(game.game_date)}{game.start_time ? ` · ${String(game.start_time).slice(0,5)}` : ""}</p>
            {game.location ? <p className="flex items-center gap-2"><MapPin size={16} className="text-[var(--brand)]" />{game.location}</p> : null}
            <p className="text-xs text-[var(--muted)]">{game.confirmed_count} presença(s) confirmada(s)</p>
          </div>
        </div>

        <div className="mt-7">
          <PublicGameConfirmationForm
            token={token}
            gameFormat={game.game_format as GameFormat}
          />
        </div>
      </section>
    </main>
  );
}
