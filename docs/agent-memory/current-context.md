# Current Context

Ultima atualizacao: 2026-07-18

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
- Repositorios Supabase para usuarios, fazendas, transacoes, uso e planejamento.
- Migrations Supabase em `supabase/migrations/`.
- Testes de politicas, parser, payload WAHA, formatadores e fluxo de checkout.

## Direcao Atual

O projeto deve manter uma memoria versionada dentro do repositorio para evitar perda de contexto entre chats Codex.

Principio adotado:

- Git guarda conhecimento versionavel: decisoes, skills, prompts, playbooks, templates e contexto resumido.
- Banco/Postgres fica para dados dinamicos: runs, logs estruturados, metricas, memoria indexavel e avaliacoes.

## Pendencias Relevantes

- Conectar repositorios Supabase aos use cases.
- Implementar onboarding conversacional por WhatsApp.
- Implementar CRUD de transacoes com auditoria e confirmacao para editar/excluir.
- Implementar planejamento de safra e itens de orcamento.
- Gerar alertas persistidos em 50%, 80%, 100% e estouro.
- Implementar processamento real com IA usando saida estruturada validada por Zod.
- Definir estrategia de historico/avaliacao de agentes, possivelmente com Postgres + pgvector depois.

## Como Continuar em Novo Chat

Instrucao curta para colar no inicio:

```text
Leia AGENTS.md e docs/agent-memory/current-context.md. Continue a partir desse contexto e atualize a memoria ao final.
```
