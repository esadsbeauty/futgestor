import { ShieldX } from "lucide-react";
import { PlayerPortalView } from "@/components/futgestor/player-portal-view";
import { getPlayerPortal } from "@/lib/queries/player-portal";
import { portalTokenSchema } from "@/lib/validators/player-portal";

export const dynamic = "force-dynamic";

export default async function PlayerPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const parsed = portalTokenSchema.safeParse(token);

  if (!parsed.success) {
    return (
      <main className="grid min-h-screen place-items-center px-5">
        <section className="card w-full max-w-md p-8 text-center">
          <ShieldX className="mx-auto size-14 text-[var(--muted)]" />

          <h1 className="mt-5 text-2xl font-black">
            Este acesso não está disponível.
          </h1>

          <p className="mt-3 text-sm text-[var(--muted)]">
            O link pode ter sido desativado ou expirado. Solicite um novo acesso
            ao responsável pelo grupo.
          </p>
        </section>
      </main>
    );
  }

  const validToken = parsed.data;
  const data = await getPlayerPortal(validToken);

  if (data) {
    return (
      <PlayerPortalView
        portal={data.portal}
        games={data.games}
        token={validToken}
      />
    );
  }

  return (
    <main className="grid min-h-screen place-items-center px-5">
      <section className="card w-full max-w-md p-8 text-center">
        <ShieldX className="mx-auto size-14 text-[var(--muted)]" />

        <h1 className="mt-5 text-2xl font-black">
          Este acesso não está disponível.
        </h1>

        <p className="mt-3 text-sm text-[var(--muted)]">
          O link pode ter sido desativado ou expirado. Solicite um novo acesso
          ao responsável pelo grupo.
        </p>
      </section>
    </main>
  );
}