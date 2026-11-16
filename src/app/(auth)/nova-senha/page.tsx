import { AuthForm } from "@/components/futgestor/auth-form";
import { updateRecoveredPassword } from "../actions";

export default function NewPasswordPage() {
  return (
    <AuthForm
      title="Criar nova senha"
      subtitle="Defina uma nova senha para voltar a acessar sua conta."
      action={updateRecoveredPassword}
      fields={[
        {
          name: "password",
          label: "Nova senha",
          type: "password",
          placeholder: "Mínimo de 8 caracteres",
        },
        {
          name: "password_confirmation",
          label: "Confirmar nova senha",
          type: "password",
          placeholder: "Repita a nova senha",
        },
      ]}
      submit="Salvar nova senha"
    />
  );
}
