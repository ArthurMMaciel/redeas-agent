# Current Context

Ultima atualizacao: 2026-08-20

## Projeto

Repositorio do Redeas Agent, um agente financeiro agricola para produtores rurais via WhatsApp.

Stack atual:

- Node.js + TypeScript
- Fastify
- Zod
- Pino
- Supabase/Postgres
- WAHA para WhatsApp
- Vitest

## Estado Atual

Ja existe uma base funcional com:

- API Fastify com rota `/health`.
- Webhook WAHA em `/webhooks/waha`.
- Parser deterministico inicial para cadastro e lancamentos financeiros.
- Validacao de prefixo Redeas no inicio da mensagem do WhatsApp permanece no webhook; mensagens sem prefixo sao ignoradas.
- Fallback de resposta livre com OpenAI para mensagens de clientes ativos/trialing que nao viram lancamento deterministico.
- Cliente OpenAI em `src/infrastructure/openai/openai-agent-client.ts`, usando `OPENAI_API_KEY` e `OPENAI_MODEL` (padrao `gpt-4o-mini`).
- Em producao, `OPENAI_API_KEY` fica em `.env.production`; `AGENT_API_KEY` e uma chave interna separada e pode coexistir.
- Endpoint interno `POST /api/v1/welcome-messages` envia mensagem de boas-vindas no WhatsApp para novo pagante. O front/outro backend passa apenas `phone` e autentica com `AGENT_API_KEY`; o agente monta a mensagem e usa WAHA internamente.
- Integracao pessoal com Google Sheets adicionada ao webhook WAHA para mensagens com prefixo `fin`, limitada aos telefones configurados em `PERSONAL_FINANCE_ALLOWED_PHONES`. Ela registra historico na aba `Lancamentos` e soma direto na aba mensal.
- Prompt de IA contextualiza o Redeas como agente financeiro agro, com controle financeiro, agenda e planejamento condicionado ao plano do cliente.
- Repositorio de assinaturas agora expoe o plano ativo do usuario para contextualizar recursos disponiveis.
- Repositorios Supabase para usuarios, fazendas, transacoes, uso e planejamento.
- Migrations Supabase em `supabase/migrations/`.
- Testes de politicas, parser, payload WAHA, formatadores e fluxo de checkout.

## Direcao Atual

O projeto deve manter uma memoria versionada dentro do repositorio para evitar perda de contexto entre chats Codex.

Principio adotado:

- Git guarda conhecimento versionavel: decisoes, skills, prompts, playbooks, templates e contexto resumido.
- Banco/Postgres fica para dados dinamicos: runs, logs estruturados, metricas, memoria indexavel e avaliacoes.
- Pagamentos, checkout, webhooks, confirmacoes, cancelamentos e atualizacoes de status de assinatura ficarao no front/outro backend.
- O Redeas Agent deve apenas ler do Supabase o status/plano resultante e aplicar bloqueios/limites antes de processar mensagens.

## Pendencias Relevantes

- Conectar repositorios Supabase aos use cases.
- Implementar onboarding conversacional por WhatsApp.
- Implementar CRUD de transacoes com auditoria e confirmacao para editar/excluir.
- Implementar planejamento de safra e itens de orcamento.
- Gerar alertas persistidos em 50%, 80%, 100% e estouro.
- Evoluir processamento com IA para saida estruturada validada por Zod antes de executar acoes financeiras alem do parser atual.
- Implementar transcricao/OCR real de audio, fotos e documentos vindos do WAHA. Preferir bibliotecas TypeScript viaveis quando houver arquivo/midia acessivel; se nao atender qualidade/formatos, usar modelos de IA para transcricao e visao.
- Definir estrategia de historico/avaliacao de agentes, possivelmente com Postgres + pgvector depois.

## Ultimos Comandos Importantes

- `git pull` -> branch ja estava atualizado.
- `npm.cmd run typecheck` -> passou.
- `npm.cmd test` -> 40 testes passaram.
- `npm.cmd run build` -> passou.
- `Get-Content .env.example`, `.env.production.example`, `src/infrastructure/config/env.ts`, `docker-compose.prod.yml` -> confirmou variaveis `OPENAI_API_KEY`, `OPENAI_MODEL`, `AGENT_API_KEY` e uso de `.env.production` no deploy Docker.
- `npm.cmd run typecheck` -> passou apos criacao da rota de boas-vindas.
- `npm.cmd test` -> 47 testes passaram apos criacao da rota de boas-vindas.
- `npm.cmd run build` -> passou apos criacao da rota de boas-vindas.
- `npm.cmd run typecheck` -> passou apos integracao pessoal com Google Sheets.
- `npm.cmd test` -> 52 testes passaram apos integracao pessoal com Google Sheets.
- `npm.cmd run build` -> passou apos integracao pessoal com Google Sheets.

## Como Continuar em Novo Chat

Instrucao curta para colar no inicio:

```text
Leia AGENTS.md e docs/agent-memory/current-context.md. Continue a partir desse contexto e atualize a memoria ao final.
```
