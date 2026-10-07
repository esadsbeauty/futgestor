import { Link2Off } from "lucide-react";
import { InvitePublicForm } from "@/components/futgestor/invite-public-form";
import { getPublicInvite } from "@/lib/queries/invites";

export const dynamic = "force-dynamic";

export default async function PublicInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await getPublicInvite(token);
  return <main className="grid min-h-screen place-items-center px-5 py-10"><section className="card glow-card w-full max-w-md p-7 sm:p-9">{invite?.available?<InvitePublicForm token={token} organizationName={invite.organization_name}/>:<div className="text-center"><Link2Off className="mx-auto size-14 text-[var(--muted)]"/><h1 className="mt-5 text-2xl font-black">Este convite não está mais disponível.</h1><p className="mt-3 text-sm text-[var(--muted)]">Peça ao responsável pelo grupo um novo link de convite.</p></div>}</section></main>;
}
