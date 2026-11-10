# Forma de pagamento no uso da mesada

## Visao geral

Exigir `Pix` ou `Cartao` em lancamentos e remocoes de `Uso Mesada Arthur` e `Uso Mesada Dari`. Pix soma no mes de referencia; cartao soma no mes seguinte, mantendo a categoria da mesada na planilha.

## Estado atual

- `parseFinanceEntryLines` interpreta a primeira linha apos o valor como descricao, caso nao seja data. Assim, `Pix` ou `Cartao` hoje viraria descricao.
- `getFinanceMonthSheetName` avanca um mes apenas para a categoria `Cartao`. As duas categorias de mesada usam o mes da data do gasto.
- Lancamento e remocao usam o mesmo parser e roteamento. A aba `Lancamentos` guarda data, aba de destino, categoria, descricao, valor, telefone e `MessageId`; nao guarda forma de pagamento.
- `git pull --ff-only origin main` em 09/11/2026: codigo ja atualizado no commit `609c396`.

## Regras propostas

```text
fin-darithur
Uso Mesada Arthur
35
Pix
```

O mesmo formato vale para Dari. A quarta linha e obrigatoria para essas duas categorias. Aceitar `pix` e `cartao` com qualquer combinacao de maiusculas/minusculas e `cartao` com ou sem til. Normalizar para `pix` ou `cartao` internamente. Descricao e data continuam opcionais nas linhas seguintes.

| Categoria | Pagamento | Aba de destino |
| --- | --- | --- |
| Uso Mesada Arthur/Dari | Pix | Mes de referencia |
| Uso Mesada Arthur/Dari | Cartao | Mes seguinte ao de referencia |
| Cartao (categoria existente) | Atual | Mes seguinte, sem mudanca |
| Demais categorias | Atual | Mes de referencia, sem mudanca |

Confirmado pelo usuario: o mes de referencia e o da data explicita do gasto, ou o da mensagem se nenhuma data for enviada. Para gastos retroativos, Pix entra no mes da data informada e cartao no mes seguinte.

## Consulta de comandos do fin-darithur

Adicionar o comando em duas linhas:

```text
fin-darithur
comandos
```

A resposta no WhatsApp deve apresentar exemplos multiline copiaveis para todos os comandos existentes da planilha de gastos acionados por `fin-darithur`, incluindo:

- Lancamento comum, uso de mesada com Pix ou Cartao e compra parcelada em Cartao.
- Remocao de valor, inclusive mesada com forma de pagamento e parcelamento com os mesmos dados da compra. Esclarecer que `remover` subtrai valor, sem apagar o historico.
- Relatorios de mes, todos os meses, categorias, categoria especifica, dia e dias do mes.
- Cadastro de necessidade, adicao, listagem e remocao de itens da lista de compras e adicao e listagem de tarefas. Mostrar somente operacoes existentes; nao anunciar exclusao de tarefas ou necessidades que ainda nao existe.

Os exemplos devem indicar os campos opcionais e como informar datas, sem incluir comandos do `agente-bote-certo` ou de outras planilhas. Organizar a mensagem por operacao e manter os exemplos coerentes com o parser e a nova regra de mesada. O comando de ajuda nao deve escrever na planilha; a autorizacao de remetente existente continua aplicada. Atualizar a documentacao e cobrir reconhecimento, conteudo e ausencia de escritas em testes.

## Destino do resumo diario

O codigo atual aceita um ID de grupo completo terminado em `@g.us` no campo de destino. Em producao, definir `PERSONAL_FINANCE_DAILY_SUMMARY_PHONE` com o ID completo do grupo desejado em `.env.production` e recriar o container da API para carregar a alteracao. A configuracao de grupos permitidos para mensagens recebidas nao define o destino do resumo. Confirmar que a sessao configurada participa do grupo e verificar o envio agendado nos logs. Nao e necessaria alteracao de codigo para essa troca.

## Destino do resumo diario

O codigo atual aceita um ID de grupo completo terminado em `@g.us` no campo de destino. Em producao, definir `PERSONAL_FINANCE_DAILY_SUMMARY_PHONE` com o ID completo do grupo desejado em `.env.production` e recriar o container da API para carregar a alteracao. A configuracao de grupos permitidos para mensagens recebidas nao define o destino do resumo. Confirmar que a sessao configurada participa do grupo e verificar o envio agendado nos logs. Nao e necessaria alteracao de codigo para essa troca.

## Consulta de comandos do fin-darithur

Adicionar o comando em duas linhas:

```text
fin-darithur
comandos
```

A resposta no WhatsApp deve apresentar exemplos multiline copiaveis para todos os comandos existentes da planilha de gastos acionados por `fin-darithur`, incluindo:

- Lancamento comum, uso de mesada com Pix ou Cartao e compra parcelada em Cartao.
- Remocao de valor, inclusive mesada com forma de pagamento e parcelamento com os mesmos dados da compra. Esclarecer que `remover` subtrai valor, sem apagar o historico.
- Relatorios de mes, todos os meses, categorias, categoria especifica, dia e dias do mes.
- Cadastro de necessidade, adicao, listagem e remocao de itens da lista de compras e adicao e listagem de tarefas. Mostrar somente operacoes existentes; nao anunciar exclusao de tarefas ou necessidades que ainda nao existe.

Os exemplos devem indicar os campos opcionais e como informar datas, sem incluir comandos do `agente-bote-certo` ou de outras planilhas. Organizar a mensagem por operacao e manter os exemplos coerentes com o parser e a nova regra de mesada. O comando de ajuda nao deve escrever na planilha; a autorizacao de remetente existente continua aplicada. Atualizar a documentacao e cobrir reconhecimento, conteudo e ausencia de escritas em testes.

## Execucao

1. Acrescentar `paymentMethod` ao comando de lancamento/remocao da mesada e criar normalizador restrito a `pix`/`cartao`, reutilizando `normalizeText`.
2. Consumir a linha de pagamento antes de extrair descricao e data. Rejeitar mesada sem pagamento ou com valor desconhecido, inclusive no formato legado de uma linha; devolver exemplo especifico na mensagem de erro. Manter a ordem `categoria/valor` ou `valor/categoria` ja suportada.
3. Ajustar o roteamento mensal para avancar um mes quando a categoria for `Cartao` ou a mesada tiver pagamento `cartao`. Usar o mesmo calculo em inclusao e remocao, inclusive na virada de dezembro.
4. Incluir o modo normalizado na resposta e no historico de modo consultavel. Preferencia: coluna nova ao fim de `Lancamentos`, preservando as oito colunas existentes e a deduplicacao em H; antes da implementacao, conferir cabecalho/permissao da aba. Relatorios existentes podem manter sua estrutura.
5. Atualizar `docs/personal-finance-sheets.md` com sintaxe, exemplos das duas mesadas e regra de competencia.
6. Cobrir parser e servico com testes para grafias de Pix/Cartao, falta/erro do modo, descricao/data opcionais, Arthur/Dari, inclusao/remocao, dezembro/janeiro, deduplicacao e preservacao das demais categorias. Rodar testes direcionados, typecheck e build.

## Riscos e limites

- A mudanca torna invalidas novas mensagens de mesada no formato antigo; lancamentos ja gravados nao serao movidos automaticamente.
- As abas mensais nao distinguem anos. Dezembro com cartao vai para Janeiro, como ocorre hoje com a categoria `Cartao`.
- A escrita do total e do historico em Google Sheets nao e atomica; uma falha intermediaria pode exigir reconciliacao, limitacao ja existente.
- A planilha atual tem historico A:H. A coluna nova requer verificar seu cabecalho e atualizar os intervalos de leitura/escrita sem deslocar `MessageId` de H.
