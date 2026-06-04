# Redeas Agent

Agente financeiro agricola para produtores rurais. O objetivo do projeto e permitir que o produtor registre entradas, saidas, compras parceladas, cartoes e planejamentos de safra por conversa, com comparacao automatica entre o realizado e o planejado.

O agente deve ajudar a responder diariamente:

- Quanto foi planejado para a safra/categoria.
- Quanto ja foi gasto.
- Quanto ainda resta.
- Onde o planejamento esta perto do limite ou estourado.
- Quais entradas, saidas, cartoes e parcelas impactam o caixa.

## Objetivo do MVP

Validar o fluxo principal do produto:

- Cadastro rapido pelo WhatsApp usando telefone como identificador operacional.
- Criacao de usuario gratuito e fazenda principal.
- Registro de entradas e saidas por mensagem.
- Planejamento agricola por safra, cultura e categoria.
- Alertas em 50%, 80%, 100% e estouro do planejado.
- Limite do plano gratis em 5 lancamentos diarios.
- Controle inicial de cartoes e compras parceladas.
- Relatorio diario as 7h no timezone `America/Sao_Paulo`.
- Estrutura preparada para assinatura e webhook de pagamento.

## Tecnologias

- **Runtime:** Node.js
- **Linguagem:** TypeScript
- **API HTTP:** Fastify
- **Validacao:** Zod
- **Logs:** Pino
- **Banco:** Supabase/Postgres
- **WhatsApp:** WAHA
- **Jobs:** node-cron
- **Pagamentos:** adapter inicial para Pagar.me
- **Testes:** Vitest

## Arquitetura

O projeto segue separacao por camadas para manter regra de negocio fora das integracoes:

```text
src/
  application/     use cases, schemas e portas
  domain/          entidades, erros, politicas e regras financeiras
  infrastructure/  HTTP, Supabase, WAHA, pagamentos e jobs
  modules/         exports por modulo
  shared/          tipos e utilitarios compartilhados
supabase/
  migrations/      schema inicial Postgres
docs/              documentos de produto, tecnico e roadmap
```

## Estado Atual

Ja existe uma fundacao funcional com:

- API Fastify com `/health`.
- Webhook WAHA em `/webhooks/waha`.
- Parser inicial para mensagens de cadastro e lancamentos financeiros.
- Repositorios Supabase para usuarios, fazendas, transacoes, uso e planejamento.
- Schema inicial do banco em `supabase/migrations/001_initial_schema.sql`.
- Testes das regras de orcamento, limite gratuito, parcelamento e parser.
- Configuracao local via `.env`.

Exemplos de mensagens aceitas pelo parser inicial:

```text
cadastro Joao Silva | Fazenda Santa Maria | Cascavel/PR | soja
gastei 500 reais em manutencao da colheitadeira
recebi 12 mil da venda de milho
```

## Configuracao

Crie um `.env` local a partir de `.env.example`:

```bash
cp .env.example .env
```

Variaveis principais:

```text
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
WAHA_BASE_URL=
WAHA_API_KEY=
WAHA_SESSION=
WAHA_DRY_RUN=false
```

Use `WAHA_DRY_RUN=true` em desenvolvimento quando quiser testar o webhook sem enviar mensagens reais pelo WAHA.

## Comandos

No Windows PowerShell, use `npm.cmd` se a execution policy bloquear `npm.ps1`.

```bash
npm install
npm run dev
npm run typecheck
npm test
npm run build
```

## Banco de Dados

A migration inicial esta em:

```text
supabase/migrations/001_initial_schema.sql
```

Para aplicar no projeto remoto via CLI Supabase:

```bash
npx supabase login
npx supabase link --project-ref xfemzxgpzhhnymedeepy
npx supabase db push
```

A CLI exige um `SUPABASE_ACCESS_TOKEN` da conta Supabase ou login interativo. As API keys do projeto nao substituem esse token.

## Webhook WAHA

Configure o WAHA para enviar mensagens recebidas para:

```text
POST /webhooks/waha
```

O endpoint aceita payloads comuns do WAHA com campos como `payload.id`, `payload.from`, `payload.body`, `payload.timestamp` e ignora mensagens `fromMe=true`.

## Seguranca

- `.env` nao deve ser versionado.
- Valores financeiros sao persistidos em centavos.
- Edicoes e exclusoes financeiras devem manter auditoria.
- Em producao, rotacione chaves expostas durante desenvolvimento antes de liberar acesso real.

