# FutGestor

**Seu baba organizado dentro e fora de campo.** Aplicação web mobile-first para participantes, mensalidades, caixa e contas a pagar de grupos de futebol. A base usa organizações em todos os dados financeiros para permitir evolução futura para SaaS.

## Stack

- Next.js (App Router), React, TypeScript estrito e Tailwind CSS
- Supabase (PostgreSQL, Auth e Row Level Security)
- Vitest para regras de negócio e testes SQL transacionais para as RPCs
- Vercel para hospedagem

## Configuração local

1. Instale Node.js 20+ e o [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started).
2. Instale dependências: `npm install`.
3. Copie `.env.example` para `.env.local` e informe a URL e a chave anônima do projeto Supabase.
4. Inicie o Supabase local e aplique todo o banco versionado: `supabase start && supabase db reset`.
5. Inicie o app: `npm run dev` e acesse `http://localhost:3000`.

As únicas variáveis usadas no cliente são:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Nunca adicione uma `SUPABASE_SERVICE_ROLE_KEY` a variáveis públicas. O cadastro envia os dados iniciais como metadados seguros para o gatilho PostgreSQL criar perfil, organização e vínculo de owner de forma atômica.

## Banco e testes

As migrations ficam em `supabase/migrations`. Elas criam constraints, índices, RLS e as RPCs idempotentes `ensure_month_fees`, `mark_fee_paid` e `mark_bill_paid`.

```bash
npm test
npm run typecheck
psql "$DATABASE_URL" -f supabase/tests/financial_rpcs.sql
```

O teste SQL abre uma transação e executa rollback. Ele verifica geração sem duplicidade, ajuste do dia 31 em fevereiro e pagamentos idempotentes.

## Módulo de participantes

`/participantes` resolve a organização da sessão no servidor, garante as mensalidades do mês pela RPC idempotente e entrega a listagem para busca e filtros locais. Cadastro e edição usam Server Actions validadas com Zod e nunca aceitam `organization_id` do navegador. O detalhe preserva o histórico, calcula os indicadores com um helper compartilhado e paga mensalidades exclusivamente por `mark_fee_paid`.

Alterar mensalidade ou vencimento atualiza apenas o cadastro do participante. Registros já existentes em `monthly_fees` não são modificados; a próxima execução de `ensure_month_fees` utiliza os novos padrões.

## Módulo financeiro

`/financeiro` utiliza o mês da query string (`?mes=AAAA-MM`) e sempre resolve a organização pela sessão no servidor. A tela garante as mensalidades pela RPC idempotente, calcula o caixa acumulado e os indicadores mensais, e reúne mensalidades, contas a pagar e movimentações.

Cadastro de contas e lançamentos manuais usa Server Actions validadas com Zod. Pagamentos nunca inserem transações pelo frontend: mensalidades chamam `mark_fee_paid` e contas chamam `mark_bill_paid`, após validar que o recurso pertence à organização atual. O schema existente já atende ao módulo, portanto nenhuma migration adicional foi necessária.

## Modelos de cobrança

Cada organização pode operar como **Mensal**, **Por jogo** ou **Mensal + avulsos**. Organizações e participantes existentes recebem o padrão mensal automaticamente pela migration versionada. Em grupos híbridos, somente participantes mensalistas recebem mensalidades; grupos por jogo não geram mensalidades. Cobranças por partida ainda não fazem parte desta etapa.

## Deploy na Vercel

1. Crie um projeto no Supabase e conecte-o localmente com `supabase link --project-ref SEU_REF`.
2. Envie as migrations: `supabase db push`.
3. Importe o repositório GitHub na Vercel.
4. Cadastre `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` nos ambientes desejados.
5. Configure no Supabase Auth a URL da Vercel e `/auth/callback` entre as Redirect URLs, então publique.

Antes de produção, habilite confirmação de e-mail no Supabase Auth e configure um provedor SMTP. Google OAuth poderá ser habilitado diretamente no Supabase sem mudar a arquitetura de sessão.
