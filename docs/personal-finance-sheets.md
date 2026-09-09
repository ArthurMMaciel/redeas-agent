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
| `IPVA` | `IPVA` |
| `IPTU` | `IPTU` |
| `Seguro` | `Seguro` |
| `MEI` | `MEI` |
| `Rino` | `Rino` |
| `Imprevistos` | `Imprevistos` |
| `Obras` | `Obras` |

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
