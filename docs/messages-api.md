# API pública de mensagens

Todos os canais usam o mesmo `MessageProcessorService`:

```text
WhatsApp / Web / Mobile / ERP
              |
              v
       MessageProcessorService
              |
              v
       Use Cases -> Supabase
```

O webhook WAHA apenas adapta o payload recebido e envia ao WhatsApp o texto retornado pelo
processador. Ele não chama casos de uso financeiros diretamente.

## Endpoint

```http
POST /api/v1/messages
Content-Type: application/json
Authorization: Bearer <AGENT_API_KEY>
```

Também é aceito o header `x-api-key`. A autenticação só é exigida quando `AGENT_API_KEY`
estiver configurada; isso permite desenvolvimento local e deixa o contrato preparado para
uma camada de autenticação dedicada.

## Exemplo

```json
{
  "channel": "web",
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "conversationId": "conversation-123",
  "message": {
    "id": "msg-123",
    "timestamp": "2026-06-18T20:00:00Z",
    "type": "text",
    "content": "gastei R$ 500,00 em manutenção"
  }
}
```

```json
{
  "success": true,
  "conversationId": "conversation-123",
  "response": {
    "message": "Saída registrada: R$ 500,00.",
    "actions": [],
    "metadata": {
      "duplicate": false,
      "channel": "web",
      "messageId": "msg-123"
    }
  }
}
```

Os tipos aceitos no contrato são `text`, `audio`, `image` e `document`. Mensagens multimídia
são aceitas e retornam `metadata.processingStatus: "accepted"`. Os adaptadores de transcrição
e extração podem ser adicionados posteriormente sem alterar o contrato público.

O par `channel + message.id` é a chave de idempotência. Reenvios retornam sucesso com
`metadata.duplicate: true`, sem repetir efeitos financeiros.

## Documentação interativa

- Swagger UI: `GET /docs`
- OpenAPI 3.1: `GET /docs/openapi.json`
