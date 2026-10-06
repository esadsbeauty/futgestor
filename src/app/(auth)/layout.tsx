import Link from "next/link";
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-screen items-center justify-center px-5 py-12"><div className="w-full max-w-md"><Link href="/" className="mb-8 flex items-center justify-center gap-3 text-xl font-bold"><span className="grid size-11 place-items-center rounded-2xl bg-[var(--brand)] text-[#07110d]">FG</span>FutGestor</Link>{children}<p className="mt-8 text-center text-sm text-[var(--muted)]">Seu baba organizado dentro e fora de campo.</p></div></main>;
}
