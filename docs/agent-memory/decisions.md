# Decisions

## 2026-10-14 - Datas de cartao e parcelamento pessoal

- Cartao soma no mes seguinte a data informada, incluindo remocoes; preservar a data da compra no historico.
- Mesada e lazer seguem o mes do gasto, conforme esclarecimento do usuario.
- Parcelamento usa valor total, quantidade e primeira fatura no mes seguinte, com divisao em centavos e historico por parcela. Remocao replica o cronograma com valores negativos.
- Limitar a 12 parcelas enquanto as abas mensais nao separam anos. Nao migrar automaticamente lancamentos existentes.

## 2026-07-18 - Memoria de agente no repositorio

Decisao:

- Comecar com memoria versionada em `docs/agent-memory/`.
- Usar `AGENTS.md` na raiz para orientar novos chats Codex a lerem essa memoria.
- Registrar contexto resumido, decisoes e proximos passos, em vez de transcrever conversas completas.

Racional:

- Skills, prompts, playbooks e decisoes sao artefatos versionaveis e combinam melhor com Git.
- Postgres faz mais sentido depois, para dados dinamicos como runs, logs, metricas, avaliacoes e memoria indexavel.
- Evita depender de salvar IDs de chats para recuperar contexto basico do projeto.

Restricoes:

- Nao salvar segredos, tokens, chaves, senhas, dados pessoais sensiveis ou transcricoes integrais.
- Atualizar a memoria somente com informacao acionavel e duravel.
