"use client";
import Link from "next/link";
import { useActionState } from "react";
import type { AuthState } from "@/app/(auth)/actions";

type Field = { name: string; label: string; type?: string; placeholder?: string; defaultValue?: string | number };
export function AuthForm({ title, subtitle, action, fields, submit, footer }: { title: string; subtitle: string; action: (state: AuthState, data: FormData) => Promise<AuthState>; fields: Field[]; submit: string; footer?: { text: string; href: string; label: string } }) {
  const [state, formAction, pending] = useActionState(action, {});
  return <section className="card p-6 sm:p-8"><h1 className="text-3xl font-bold tracking-tight">{title}</h1><p className="mt-2 text-[var(--muted)]">{subtitle}</p><form action={formAction} className="mt-7 space-y-4"><input type="hidden" name="origin" value={typeof window === "undefined" ? "" : window.location.origin}/>{fields.map((field) => <label key={field.name} className="block text-sm font-medium"><span>{field.label}</span><input required name={field.name} type={field.type ?? "text"} placeholder={field.placeholder} defaultValue={field.defaultValue} className="focus-ring mt-2 w-full rounded-xl border border-[var(--border)] bg-white/5 px-4 py-3.5 text-white placeholder:text-white/30" /></label>)}{state.error && <p role="status" className="rounded-xl bg-white/5 p-3 text-sm text-[var(--muted)]">{state.error}</p>}<button disabled={pending} className="focus-ring w-full rounded-xl bg-[var(--brand)] px-4 py-3.5 font-bold text-[#07110d] disabled:opacity-60">{pending ? "Aguarde..." : submit}</button></form>{footer && <p className="mt-6 text-center text-sm text-[var(--muted)]">{footer.text} <Link className="font-semibold text-[var(--brand)]" href={footer.href}>{footer.label}</Link></p>}</section>;
}
