import { CalendarDays, CheckCircle2, Link2Off, MapPin, XCircle } from "lucide-react";
import { PublicGameConfirmationForm } from "@/components/futgestor/public-game-confirmation-form";
import { formatDate } from "@/lib/formatters";
import {
  getPublicGameInvite,
  getPublicGameInviteResponses,
} from "@/lib/queries/games";
import type { GuestPosition, GuestSportType } from "@/types/games";

export const dynamic = "force-dynamic";

const sportLabels: Record<GuestSportType, string> = {
  futsal: "Futsal",
  football: "Futebol",
};

const positionLabels: Record<GuestPosition, string> = {
  goalkeeper: "Goleiro",
  fixed: "Fixo",
  winger: "Ala / Ponta",
  pivot: "Pivô",
  full_back: "Lateral",
  center_back: "Zagueiro",
  defensive_mid: "Volante",
  midfielder: "Meio-campo",
  striker: "Atacante",
  other: "Outra",
};

export default async function PublicGameInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [game, responses] = await Promise.all([
    getPublicGameInvite(token),
    getPublicGameInviteResponses(token),
  ]);

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

  const confirmed = responses.filter((item) => item.attendance_status === "confirmed");
  const declined = responses.filter((item) => item.attendance_status === "declined");

  return (
    <main className="min-h-screen px-5 py-10">
      <div className="mx-auto grid w-full max-w-4xl gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,.9fr)]">
        <section className="card glow-card p-7 sm:p-9">
          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[var(--brand)]">
              Convite para o jogo
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight">{game.title}</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">{game.organization_name}</p>

            <div className="mt-5 space-y-2 rounded-2xl border border-[var(--border)] bg-white/[.025] p-4 text-left text-sm">
              <p className="flex items-center gap-2">
                <CalendarDays size={16} className="text-[var(--brand)]" />
                {formatDate(game.game_date)}
                {game.start_time ? ` · ${String(game.start_time).slice(0, 5)}` : ""}
              </p>
              {game.location ? (
                <p className="flex items-center gap-2">
                  <MapPin size={16} className="text-[var(--brand)]" />
                  {game.location}
                </p>
              ) : null}
              <p className="text-xs text-[var(--muted)]">
                {confirmed.length} confirmado(s) · {declined.length} não vai/vão
              </p>
            </div>
          </div>

          <div className="mt-7">
            <PublicGameConfirmationForm token={token} />
          </div>
        </section>

        <section className="card p-5 sm:p-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[var(--brand)]">
              Lista do jogo
            </p>
            <h2 className="mt-2 text-xl font-black">Quem respondeu</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Veja quem já confirmou presença e quem informou que não vai.
            </p>
          </div>

          <div className="mt-5">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={17} className="text-[var(--success)]" />
              <h3 className="font-bold">Confirmados ({confirmed.length})</h3>
            </div>

            <div className="mt-3 space-y-2">
              {confirmed.length ? (
                confirmed.map((player, index) => (
                  <div
                    key={`${player.name}-${player.created_at}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-white/[.025] px-3 py-3"
                  >
                    <span className="min-w-0 truncate text-sm font-bold">{player.name}</span>
                    <span className="shrink-0 text-right text-xs text-[var(--muted)]">
                      {player.sport_type && player.position
                        ? `${sportLabels[player.sport_type]} · ${positionLabels[player.position]}`
                        : ""}
                    </span>
                  </div>
                ))
              ) : (
                <p className="rounded-xl bg-white/[.03] p-4 text-sm text-[var(--muted)]">
                  Ninguém confirmou presença ainda.
                </p>
              )}
            </div>
          </div>

          {declined.length ? (
            <div className="mt-6 border-t border-[var(--border)] pt-5">
              <div className="flex items-center gap-2">
                <XCircle size={17} className="text-[var(--danger)]" />
                <h3 className="font-bold">Não vão ({declined.length})</h3>
              </div>
              <div className="mt-3 space-y-2">
                {declined.map((player, index) => (
                  <div
                    key={`${player.name}-${player.created_at}-declined-${index}`}
                    className="rounded-xl border border-[var(--border)] bg-white/[.025] px-3 py-3 text-sm font-bold"
                  >
                    {player.name}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
