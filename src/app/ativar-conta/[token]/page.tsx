import { Link2Off } from "lucide-react";
import { PlayerAccountActivationForm } from "@/components/futgestor/player-account-activation-form";
import { getPlayerPortal } from "@/lib/queries/player-portal";
import { portalTokenSchema } from "@/lib/validators/player-portal";

export const dynamic = "force-dynamic";

function UnavailableActivation() {
  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <section className="card glow-card w-full max-w-md p-7 text-center sm:p-9">
        <Link2Off className="mx-auto size-14 text-[var(--muted)]" />
        <h1 className="mt-5 text-2xl font-black">
          Este link não está mais disponível.
        </h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Peça ao responsável pelo grupo um novo link de ativação.
        </p>
      </section>
    </main>
  );
}

export default async function ActivatePlayerAccountPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const parsed = portalTokenSchema.safeParse(token);

  if (!parsed.success) {
    return <UnavailableActivation />;
  }

  const validToken = parsed.data;
  const data = await getPlayerPortal(validToken);

  if (
    !data?.portal.available ||
    !data.portal.organization_name ||
    !data.portal.player_name
  ) {
    return <UnavailableActivation />;
  }

  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <section className="card glow-card w-full max-w-md p-7 sm:p-9">
        <PlayerAccountActivationForm
          token={validToken}
          organizationName={data.portal.organization_name}
          playerName={data.portal.player_name}
        />
      </section>
    </main>
  );
}
