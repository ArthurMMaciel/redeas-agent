# Fluxo pago de cadastro

O cadastro do Redeas nao acontece mais pelo WhatsApp. O WhatsApp so atende numeros
que ja tenham usuario criado e assinatura ativa.

## Planos

- `finance_basic`: R$ 25,90 por mes. Controle financeiro e agenda.
- `finance_safra`: R$ 65,00 por mes. Controle financeiro, agenda e planejamento de safra.

Os planos ficam na tabela `plans` e sao atualizados pela migration
`supabase/migrations/002_paid_signup_flow.sql`.

## Landing -> API

A landing deve chamar:

```http
POST /api/v1/checkouts
Content-Type: application/json
```

Payload:

```json
{
  "planCode": "finance_basic",
  "name": "Joao Silva",
  "phone": "(44) 99999-9999",
  "email": "joao@example.com",
  "farmName": "Fazenda Modelo",
  "city": "Cascavel",
  "state": "PR",
  "mainActivity": "soja"
}
```

Resposta:

```json
{
  "success": true,
  "data": {
    "checkoutIntentId": "uuid",
    "planCode": "finance_basic",
    "checkoutUrl": "https://checkout..."
  }
}
```

A landing deve redirecionar o usuario para `data.checkoutUrl`.

## Pagamento -> API

O gateway de pagamento deve chamar:

```http
POST /webhooks/payments
Content-Type: application/json
```

Payload minimo esperado pelo backend atual:

```json
{
  "gateway": "pagarme",
  "eventType": "payment.paid",
  "gatewayCheckoutId": "id-retornado-ao-criar-checkout",
  "gatewayPaymentId": "id-do-pagamento"
}
```

Quando o evento pago chega, o backend:

1. Salva o evento em `payment_events`.
2. Localiza a `checkout_intent` pelo `gatewayCheckoutId`.
3. Marca a intencao como `paid`.
4. Cria ou atualiza o usuario pelo telefone.
5. Cria a fazenda se o usuario ainda nao tiver uma.
6. Cria a assinatura ativa.
7. Envia pelo WAHA:

```text
Olá, sou rédeas, seu agente de controle financeiro e agenda agro.
```

## WhatsApp

Se um numero desconhecido chamar o agente, o backend responde que o cadastro deve ser
feito pela pagina oficial. Nao existe mais cadastro rapido por mensagem.

Se um usuario existir mas a assinatura nao estiver `active` ou `trialing`, o backend
tambem bloqueia o atendimento e orienta concluir o pagamento.

## Dominio

Um unico dominio pode servir a landing e o agente:

- `www.seudominio.com.br`: Vercel, landing page.
- `api.seudominio.com.br`: VPS, API Node/Fastify.
- Opcional: `waha.seudominio.com.br`: somente se o WAHA precisar ficar exposto.

