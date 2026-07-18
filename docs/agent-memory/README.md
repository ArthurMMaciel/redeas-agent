# Agent Memory

Esta pasta guarda contexto persistente para novos chats do Codex neste repositorio.

## Como usar

No inicio de uma nova conversa, peca ao agente:

```text
Leia AGENTS.md e docs/agent-memory/current-context.md antes de mexer no codigo.
```

Ao final de uma sessao relevante, peca:

```text
Atualize a memoria do agente com o que foi decidido, alterado e o que falta fazer.
```

## Arquivos

- `current-context.md`: resumo vivo do estado do projeto.
- `decisions.md`: decisoes tecnicas e de produto que devem sobreviver entre chats.
- `session-template.md`: modelo para registrar sessoes importantes.
- `sessions/`: notas historicas de sessoes, quando fizer sentido manter trilha.

## Regra de seguranca

Nao salve segredos, tokens, chaves, senhas, dados pessoais sensiveis ou transcricoes completas. Conversas devem virar resumo tecnico acionavel.
