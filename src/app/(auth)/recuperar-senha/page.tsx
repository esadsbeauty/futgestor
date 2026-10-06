import { AuthForm } from "@/components/futgestor/auth-form";
import { recover } from "../actions";
export default function RecoverPage() { return <AuthForm title="Recuperar senha" subtitle="Enviaremos um link seguro para seu e-mail." action={recover} fields={[{ name: "email", label: "E-mail", type: "email" }]} submit="Enviar instruções" footer={{ text: "Lembrou a senha?", href: "/login", label: "Voltar" }}/>; }
