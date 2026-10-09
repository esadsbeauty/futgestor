import { Link2Off } from "lucide-react";
import { AdminInviteForm } from "@/components/futgestor/admin-invite-form";
import { getPublicAdminInvite } from "@/lib/queries/admin-invites";

export const dynamic = "force-dynamic";

export default async function AdminInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await getPublicAdminInvite(token);

  if (!invite) {
    return (
      <main className="grid min-h-screen place-items-center px-5 py-10">
        <section className="card glow-card w-full max-w-md p-7 text-center sm:p-9">
          <Link2Off className="mx-auto size-14 text-[var(--muted)]" />
          <h1 className="mt-5 text-2xl font-black">Este convite não está mais disponível.</h1>
          <p className="mt-3 text-sm text-[var(--muted)]">
            Peça ao proprietário da organização um novo convite de administrador.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <section className="card glow-card w-full max-w-md p-7 sm:p-9">
        <AdminInviteForm
          token={token}
          organizationName={invite.organization_name}
          email={invite.email}
        />
      </section>
    </main>
  );
}
