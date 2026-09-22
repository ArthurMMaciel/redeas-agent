# Integracao pessoal com Google Sheets

Fluxo:

```text
WhatsApp -> WAHA -> /webhooks/waha -> Google Sheets -> WhatsApp
```

Mensagens devem vir de um telefone permitido e começar exatamente com
`fin-darithur`. O formato recomendado e multiline, sem uso de IA:

```text
fin-darithur
Mercado
85.90
arroz e carne
22/08/2026
```

As linhas depois do gatilho representam categoria, valor, descricao e data. A descricao pode ser
omitida; nesse caso a API usa o nome da categoria.

Exemplos:

```text
fin-darithur
Gasolina
120
posto shell
22/08/2026
```

Categorias aceitas no WhatsApp e escrita recomendada na planilha mensal:

| Enviar no WhatsApp | Linha recomendada na planilha |
| --- | --- |
| `Condominio` ou `Condomínio` | `Condomínio` |
| `Gas` ou `Gás` | `Gás` |
| `Luz` | `Luz` |
| `Internet` | `Internet` |
| `Unimed` | `Unimed` |
| `Mercado` | `Mercado` |
| `Gasolina` | `Gasolina` |
| `Cartao` ou `Cartão` | `Cartão` |
| `Banho Sukita` | `Banho Sukita` |
| `Reserva` | `Reserva` |
| `Investimentos` | `Investimentos` |
| `Lazer` | `Lazer` |
| `Caixinha` | `Caixinha` |
| `Viagem` | `Viagem` |
| `Moto` | `Moto` |
| `Saude` ou `Saúde` | `Saúde` |
| `MEI` | `MEI` |
| `Rino` | `Rino` |
| `Seguro` | `Seguro` |
| `IPVA` | `IPVA` |
| `IPTU` | `IPTU` |
| `Muay-thai` | `Muay-thai` |
| `Imprevistos` | `Imprevistos` |
| `Obras` | `Obras` |
| `Uso Mesada Arthur` | `Uso Mesada Arthur` |
| `Uso Mesada Dari` | `Uso Mesada Dari` |

O parser ignora acentos e maiusculas/minusculas, entao `cartao`, `cartão`,
`Cartao` e `Cartão` funcionam.

Na planilha mensal, a comparacao tambem ignora acentos e maiusculas/minusculas,
mas a escrita recomendada acima deixa o historico mais legivel.

## Planilha

O ID da planilha informada e:

```text
1gGlTzY7uuYyzpb5TVmrD8Yg4XsIlxrWSl6tp38_4j2c
```

A API registra historico na aba `Lancamentos`, colunas `A:H`:

```text
RegistradoEm | Data | Mes | Categoria | Descricao | Valor | Telefone | MessageId
```

Ela tambem soma o valor na aba do mes. Por padrao:

- categoria na coluna `A`;
- total/somatorio na coluna `B`.

Se a sua planilha usar outras colunas, altere:

```env
PERSONAL_FINANCE_MONTH_CATEGORY_COLUMN=A
PERSONAL_FINANCE_MONTH_VALUE_COLUMN=B
```

Os nomes padrao das abas mensais sao em portugues. Se a aba de marco estiver
sem cedilha, com numero, ou qualquer outro nome, defina os 12 nomes em ordem:

```text
Janeiro,Fevereiro,Marco,Abril,Maio,Junho,Julho,Agosto,Setembro,Outubro,Novembro,Dezembro
```

```env
PERSONAL_FINANCE_MONTH_SHEET_NAMES=Janeiro,Fevereiro,Marco,Abril,Maio,Junho,Julho,Agosto,Setembro,Outubro,Novembro,Dezembro
```

## Credenciais Google

Mesmo com a planilha marcada como "qualquer pessoa com o link pode editar", a API
deve usar uma Service Account para escrever com seguranca. Nao use API key no
navegador.

No Google Cloud:

1. Crie/selecione um projeto.
2. Ative a Google Sheets API.
3. Crie uma Service Account.
4. Em `Chaves`, crie uma chave JSON.
5. Guarde o JSON fora do Git na VPS.
6. Compartilhe a planilha com o email `client_email` do JSON como Editor.

Para encontrar o email da Service Account, abra o projeto no Google Cloud,
acesse `IAM e administrador` -> `Contas de serviço`, abra a conta criada e copie
o campo `Email`. Esse email e o que deve ser adicionado em `Compartilhar` na
planilha, com permissao de Editor.

Na VPS, sugestao:

```text
/opt/redeas/secrets/google-service-account.json
```

`.env.production`:

```env
WAHA_PROCESS_PRIVATE_FROM_ME=true
WAHA_OWN_PHONE=5544998924520

PERSONAL_FINANCE_GOOGLE_CREDENTIALS_PATH=/opt/redeas/secrets/google-service-account.json
PERSONAL_FINANCE_GOOGLE_SHEET_ID=1gGlTzY7uuYyzpb5TVmrD8Yg4XsIlxrWSl6tp38_4j2c
PERSONAL_FINANCE_ALLOWED_PHONES=5544998924520,5544998581299
PERSONAL_FINANCE_ALLOWED_LIDS=11085394505852@lid
PERSONAL_FINANCE_LANCAMENTOS_SHEET=Lancamentos
PERSONAL_FINANCE_MONTH_CATEGORY_COLUMN=A
PERSONAL_FINANCE_MONTH_VALUE_COLUMN=B
```

Se o WAHA entregar mensagens privadas com `senderId` no formato `@lid` e nao conseguir
resolver esse LID para o telefone real, inclua o LID observado nos logs em
`PERSONAL_FINANCE_ALLOWED_LIDS`.

## Comandos financeiros no WhatsApp

Todos os comandos financeiros continuam usando a primeira linha exatamente como `fin-darithur`.

Lancamento:

```text
fin-darithur
Mercado
85.90
arroz e carne
22/09/2026
```

Remover/subtrair valor da categoria no mes da data informada:

```text
fin-darithur
remover
Mercado
85.90
compra duplicada
22/09/2026
```

Relatorio mensal:

```text
fin-darithur
relatorio
mes
09/2026
```

Relatorio de todos os meses, somando cada aba mensal:

```text
fin-darithur
relatorio
todos
```

Relatorio de categorias em todos os meses:

```text
fin-darithur
relatorio
categorias
```

Relatorio de uma categoria em todos os meses ou em um mes especifico:

```text
fin-darithur
relatorio
categoria
Mercado
```

```text
fin-darithur
relatorio
categoria
Mercado
09/2026
```

Relatorio de um dia ou consolidado diario de um mes, usando a aba `Lancamentos`:

```text
fin-darithur
relatorio
dia
22/09/2026
```

```text
fin-darithur
relatorio
dias
09/2026
```

## Necessidades

A aba `Necessidades` deve ter apenas as colunas `Item` e `Comprado em`. O item e obrigatorio. A data de compra e opcional.

```text
fin-darithur
necessidade
Filtro de agua
```

```text
fin-darithur
necessidade
Filtro de agua
22/09/2026
```

A aba pode ser renomeada via:

```env
PERSONAL_FINANCE_NECESSIDADES_SHEET=Necessidades
```

## Futebol: agente-bote-certo

A outra planilha usa o gatilho `agente-bote-certo`. Compartilhe essa planilha com a mesma Service Account usada nas financas, como Editor.

Estrutura esperada:

- Primeira aba: `Visao Geral`.
- Abas seguintes: `Janeiro` ate `Dezembro`, nessa ordem/nome.
- Em cada aba mensal, colunas `A:G`:

```text
Atleta | Gols | Gols contra | Assistencias | Cartoes amarelos | Cartoes vermelhos | Jogos
```

Payload em lote:

```text
agente-bote-certo
Setembro
Braza,1,2,3,0,0,1
Igao,2
Joao Gustavo,0,0,1,1,0,1
```

A primeira linha depois do gatilho pode ser o mes. Se omitir o mes, a API usa o mes atual. Depois disso, cada linha representa:

```text
Atleta,Gols,Gols contra,Assistencias,Cartoes amarelos,Cartoes vermelhos,Jogos
```

Nao precisa mandar todas as colunas. `Braza,2` soma 2 em `Gols` e deixa as outras colunas como estao. Valores `0` sao aceitos no payload completo.

Os comandos antigos simples ainda funcionam, usando o mes atual:

```text
agente-bote-certo
gol
Braza
1
```

Relatorios do mes atual ou de um mes informado:

```text
agente-bote-certo
relatorio
resumo
Setembro
```

```text
agente-bote-certo
relatorio
gols
Setembro
```

Tipos de relatorio aceitos: `resumo`, `gols`, `gols contra`, `assistencias`, `amarelos`, `vermelhos`, `jogos`.

Variavel obrigatoria:

```env
PERSONAL_FOOTBALL_GOOGLE_SHEET_ID=
```
