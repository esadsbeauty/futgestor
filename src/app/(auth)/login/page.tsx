import Link from "next/link";
import { AuthForm } from "@/components/futgestor/auth-form";
import { login } from "../actions";
export default function LoginPage() { return <><AuthForm title="Boas-vindas" subtitle="Entre para cuidar do seu baba." action={login} fields={[{ name: "email", label: "E-mail", type: "email", placeholder: "voce@email.com" }, { name: "password", label: "Senha", type: "password", placeholder: "••••••••" }]} submit="Entrar" footer={{ text: "Ainda não tem conta?", href: "/cadastro", label: "Criar conta" }}/><Link href="/recuperar-senha" className="mt-4 block text-center text-sm text-[var(--muted)]">Esqueci minha senha</Link></>; }
