# Prompt para gerar a landing page

Use este prompt no Codex que esta construindo a landing page:

```text
Voce esta construindo a landing page do Redeas, um agente de WhatsApp para controle financeiro e agenda agro.

Contexto do produto:
- O cadastro SEMPRE acontece pela landing page, nunca pelo WhatsApp.
- Depois do pagamento aprovado, o backend cria o usuario pagante, cria a fazenda, ativa a assinatura e envia uma mensagem no WhatsApp:
  "Olá, sou rédeas, seu agente de controle financeiro e rotina agro."
- O identificador operacional do cliente e o numero de celular. O telefone preenchido na landing precisa ser o mesmo numero que vai conversar com o agente no WhatsApp.

Planos:
1. Plano Controle Financeiro
   - Codigo: finance_basic
   - Preco: R$ 25,90/mes
   - Inclui: controle financeiro pelo WhatsApp e agenda agro.
   - Nao inclui: planejamento de safra.

2. Plano Financeiro + Safra
   - Codigo: finance_safra
   - Preco: R$ 65,00/mes
   - Inclui: controle financeiro pelo WhatsApp, agenda agro e planejamento de safra.

Formulario obrigatorio antes do pagamento:
- Nome completo
- Telefone WhatsApp
- Email
- Nome da fazenda
- Cidade
- UF
- Atividade principal/cultura principal
- Plano escolhido

Contrato com o backend:
- Base URL de producao da API: https://api.DOMINIO_DO_CLIENTE
- Criar checkout chamando:

POST /api/v1/checkouts
Content-Type: application/json

Payload:
{
  "planCode": "finance_basic" | "finance_safra",
  "name": "Nome do cliente",
  "phone": "(44) 99999-9999",
  "email": "cliente@email.com",
  "farmName": "Fazenda Modelo",
  "city": "Cascavel",
  "state": "PR",
  "mainActivity": "soja"
}

Resposta esperada:
{
  "success": true,
  "data": {
    "checkoutIntentId": "uuid",
    "planCode": "finance_basic",
    "checkoutUrl": "https://checkout..."
  }
}

Comportamento da landing:
- Ao clicar em assinar, validar o formulario.
- Enviar os dados para POST /api/v1/checkouts.
- Enquanto cria o checkout, mostrar estado de carregamento no botao.
- Se der sucesso, redirecionar para data.checkoutUrl.
- Se der erro, mostrar mensagem clara e manter os dados preenchidos.
- Nao criar usuario diretamente no frontend.
- Nao enviar mensagem de WhatsApp pelo frontend.
- Nao prometer acesso antes da aprovacao do pagamento.

Rotas/paginas recomendadas:
- /: landing com proposta, planos e formulario/checkout.
- /pagamento/aprovado: informar que o pagamento foi recebido e que o WhatsApp sera liberado apos confirmacao.
- /pagamento/cancelado: orientar a tentar novamente.

Dominio:
- A landing pode ficar na Vercel em www.DOMINIO_DO_CLIENTE.
- A API fica na VPS em api.DOMINIO_DO_CLIENTE.
- Usar variavel de ambiente NEXT_PUBLIC_API_BASE_URL para configurar a API.

Design:
- Visual profissional para produtor rural, consultor agro e pequenas fazendas.
- Evitar cara de dashboard interno; isto e uma pagina comercial com conversao.
- Mostrar claramente a diferenca entre os dois planos.
- O primeiro CTA deve levar ao plano Controle Financeiro, mas a pagina deve permitir escolher o plano Financeiro + Safra.
- Textos em portugues brasileiro.
```

