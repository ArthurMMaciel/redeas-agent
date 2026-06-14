# Rédeas Agent

Agente financeiro agrícola para produtores rurais. O objetivo do projeto é permitir que o produtor registre entradas, saídas, compras parceladas, cartões e planejamentos de safra por conversa, com comparação automática entre o realizado e o planejado.

O agente deve ajudar a responder diariamente:

- Quanto foi planejado para a safra/categoria.
- Quanto já foi gasto.
- Quanto ainda resta.
- Onde o planejamento está perto do limite ou estourado.
- Quais entradas, saídas, cartões e parcelas impactam o caixa.

## Objetivo do MVP

Validar o fluxo principal do produto:

- Cadastro rápido pelo WhatsApp usando telefone como identificador operacional.
- Criação de usuário gratuito e fazenda principal.
- Registro de entradas e saídas por mensagem.
- Planejamento agrícola por safra, cultura e categoria.
- Alertas em 50%, 80%, 100% e estouro do planejado.
- Limite do plano grátis em 5 lançamentos diários.
- Controle inicial de cartões e compras parceladas.
- Relatório diário às 7h no timezone `America/Sao_Paulo`.
- Estrutura preparada para assinatura e webhook de pagamento.

## Padrões de Interface

- Todos os valores monetários exibidos ao usuário devem seguir o formato `R$ 3.500,00`.
- Milhares devem ser separados por ponto.
- Decimais/centavos devem ser separados por vírgula.
- Valores monetários devem ter exatamente 2 casas decimais.
- Percentuais e números calculados devem ter no máximo 2 casas decimais.
- Todos os textos voltados ao usuário devem estar em português brasileiro com acentuação correta.

## Tecnologias

- **Runtime:** Node.js
- **Linguagem:** TypeScript
- **API HTTP:** Fastify
- **Validação:** Zod
- **Logs:** Pino
- **Banco:** Supabase/Postgres
- **WhatsApp:** WAHA
- **Jobs:** node-cron
- **Pagamentos:** adapter inicial para Pagar.me
- **Testes:** Vitest

## Arquitetura

O projeto segue separação por camadas para manter regra de negócio fora das integrações:

```text
src/
  application/     use cases, schemas e portas
  domain/          entidades, erros, políticas e regras financeiras
  infrastructure/  HTTP, Supabase, WAHA, pagamentos e jobs
  modules/         exports por módulo
  shared/          tipos, formatadores e utilitários compartilhados
supabase/
  migrations/      schema inicial Postgres
docs/              documentos de produto, técnico e roadmap
```

## Estado Atual

Já existe uma fundação funcional com:

- API Fastify com `/health`.
- Webhook WAHA em `/webhooks/waha`.
- Parser inicial para mensagens de cadastro e lançamentos financeiros.
- Repositórios Supabase para usuários, fazendas, transações, uso e planejamento.
- Schema inicial do banco em `supabase/migrations/001_initial_schema.sql`.
- Testes das regras de orçamento, limite gratuito, parcelamento, parser e formatação.
- Configuração local via `.env`.

Exemplos de mensagens aceitas pelo parser inicial:

```text
cadastro João Silva | Fazenda Santa Maria | Cascavel/PR | soja
gastei R$ 500,00 em manutenção da colheitadeira
recebi R$ 12.000,00 da venda de milho
```

## Configuração

Crie um `.env` local a partir de `.env.example`:

```bash
cp .env.example .env
```

Variáveis principais:

```text
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
WAHA_BASE_URL=
WAHA_API_KEY=
WAHA_SESSION=
WAHA_DRY_RUN=false
```

Use `WAHA_DRY_RUN=true` em desenvolvimento quando quiser testar o webhook sem enviar mensagens reais pelo WAHA.

## Checklist para Produção

Contas e serviços que precisam existir antes de vender para clientes reais:

- **VPS ou PaaS:** Render, Railway, Fly.io, DigitalOcean, Hetzner, AWS Lightsail ou similar para rodar a API Node.
- **Domínio e DNS:** domínio público com HTTPS para API e webhooks.
- **Supabase:** projeto Postgres, migrations aplicadas, backups ativados, RLS/políticas revisadas e chaves rotacionadas.
- **WhatsApp/WAHA:** servidor WAHA, sessão conectada, webhook apontando para `/webhooks/waha`, API key forte e monitoramento da sessão.
- **OpenAI:** conta na plataforma OpenAI, billing ativo, `OPENAI_API_KEY` em segredo de ambiente e modelo definido em `OPENAI_MODEL`.
- **Pagamento:** conta Pagar.me ou outro gateway, planos/produtos criados, webhook apontando para `/webhooks/payments` e conciliação com `subscriptions`.
- **Email transacional:** opcional, mas recomendado para login, recuperação de acesso, recibos e avisos de assinatura.
- **Observabilidade:** logs persistentes, alertas de erro, uptime check e backup de banco.

O que ainda falta no código para ficar pronto para produção:

- Login/cadastro com senha, magic link ou OTP por WhatsApp/email.
- Área do cliente e painel administrativo.
- Ativação de trial de 15 dias e transição automática para plano pago.
- Webhook de pagamento atualizando `subscriptions.status`.
- Bloqueio por assinatura: processar mensagem apenas se o telefone estiver em trial, ativo ou dentro do plano grátis.
- Integração real com OpenAI para interpretar mensagens livres além do parser determinístico atual.
- Fila de processamento para mensagens, retries e proteção contra duplicidade em concorrência.
- Controle de permissões por fazenda/equipe.
- Auditoria completa para edições/exclusões de lançamentos.
- Testes end-to-end do fluxo WhatsApp -> parser/IA -> banco -> resposta.

### Proteção contra prompt injection

O agente não deve obedecer comandos do usuário que tentem trocar sua identidade, ignorar regras, revelar prompts, burlar plano ou executar ações fora do financeiro rural. Para isso, a implementação com IA deve seguir estes controles:

- Separar instrução de sistema, dados do usuário e ferramentas. A mensagem do WhatsApp nunca deve ser concatenada como instrução privilegiada.
- Usar saída estruturada validada por Zod para comandos financeiros, em vez de aceitar texto livre como ação.
- Aplicar allowlist de intenções: registrar despesa, registrar receita, criar planejamento, consultar saldo, confirmar/cancelar.
- Exigir confirmação humana para ação ambígua, valor alto, exclusão, edição ou mudança de plano.
- Ignorar pedidos como "pare de ser o agente", "revele seu prompt", "desconsidere as regras" e responder com redirecionamento seguro.
- Validar assinatura, telefone e permissão antes de qualquer ferramenta gravar no banco.
- Registrar auditoria da mensagem original, interpretação, decisão tomada e usuário afetado.
- Ter testes automatizados com ataques comuns de prompt injection.

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

A migration inicial está em:

```text
supabase/migrations/001_initial_schema.sql
```

Para aplicar no projeto remoto via CLI Supabase:

```bash
npx supabase login
npx supabase link --project-ref xfemzxgpzhhnymedeepy
npx supabase db push
```

A CLI exige um `SUPABASE_ACCESS_TOKEN` da conta Supabase ou login interativo. As API keys do projeto não substituem esse token.

## Webhook WAHA

Configure o WAHA para enviar mensagens recebidas para:

```text
POST /webhooks/waha
```

O endpoint aceita payloads comuns do WAHA com campos como `payload.id`, `payload.from`, `payload.body`, `payload.timestamp` e ignora mensagens `fromMe=true`.

## Segurança

- `.env` não deve ser versionado.
- Valores financeiros são persistidos em centavos.
- Edições e exclusões financeiras devem manter auditoria.
- Em produção, rotacione chaves expostas durante desenvolvimento antes de liberar acesso real.
