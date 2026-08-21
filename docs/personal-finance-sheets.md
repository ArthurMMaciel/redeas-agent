# Integracao pessoal com Google Sheets

Fluxo:

```text
WhatsApp -> WAHA -> /webhooks/waha -> Google Sheets -> WhatsApp
```

Mensagens devem comecar com `fin` e vir de um telefone permitido.

Exemplos:

```text
fin mercado 85,90 arroz e carne
fin gasolina 120 posto shell hoje
fin lazer 45 cinema ontem
fin banho sukita 70 banho do mes
fin luz 210 pago 20/08
```

Categorias aceitas:

```text
Condominio
Gas
Luz
Internet
Unimed
Mercado
Gasolina
Cartao
Banho Sukita
Reserva
Investimentos
Lazer
Caixinha
Viagem
Moto
Saude
MEI
Rino
Imprevistos
Obras
```

O parser ignora acentos e maiusculas/minusculas, entao `cartao`, `cartão`,
`Cartao` e `Cartão` funcionam.

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
PERSONAL_FINANCE_LANCAMENTOS_SHEET=Lancamentos
PERSONAL_FINANCE_MONTH_CATEGORY_COLUMN=A
PERSONAL_FINANCE_MONTH_VALUE_COLUMN=B
```
