import type { FastifyInstance } from "fastify";

const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "Rédeas Agent API",
    version: "1.0.0",
    description: "API pública multicanal para envio de mensagens ao agente financeiro agrícola."
  },
  servers: [
    { url: "https://api.redeas.com.br", description: "Produção" },
    { url: "http://localhost:3000", description: "Desenvolvimento" }
  ],
  paths: {
    "/api/v1/messages": {
      post: {
        summary: "Envia uma mensagem ao agente",
        operationId: "sendMessage",
        security: [{ apiKey: [] }, { bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/InboundMessage" },
              examples: {
                text: {
                  value: {
                    channel: "web",
                    userId: "123e4567-e89b-12d3-a456-426614174000",
                    conversationId: "conversation-123",
                    message: {
                      id: "msg-123",
                      timestamp: "2026-06-18T20:00:00Z",
                      type: "text",
                      content: "Quero saber quanto já gastei em sementes"
                    }
                  }
                }
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Mensagem processada",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AgentResponse" }
              }
            }
          },
          "400": { description: "Payload inválido" },
          "401": { description: "API key inválida ou ausente" },
          "404": { description: "Usuário não encontrado" }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      apiKey: { type: "apiKey", in: "header", name: "x-api-key" },
      bearerAuth: { type: "http", scheme: "bearer" }
    },
    schemas: {
      InboundMessage: {
        type: "object",
        additionalProperties: false,
        required: ["channel", "userId", "conversationId", "message"],
        properties: {
          channel: { type: "string", example: "web" },
          userId: { type: "string", format: "uuid" },
          conversationId: { type: "string" },
          message: {
            type: "object",
            additionalProperties: false,
            required: ["id", "timestamp", "type", "content"],
            properties: {
              id: { type: "string" },
              timestamp: { type: "string", format: "date-time" },
              type: {
                type: "string",
                enum: ["text", "audio", "image", "document"]
              },
              content: { type: "string" }
            }
          }
        }
      },
      AgentResponse: {
        type: "object",
        required: ["success", "conversationId", "response"],
        properties: {
          success: { type: "boolean", const: true },
          conversationId: { type: "string" },
          response: {
            type: "object",
            required: ["message", "actions", "metadata"],
            properties: {
              message: { type: "string" },
              actions: { type: "array", items: {} },
              metadata: { type: "object", additionalProperties: true }
            }
          }
        }
      }
    }
  }
} as const;

export function registerOpenApiRoutes(app: FastifyInstance) {
  app.get("/docs/openapi.json", async (_request, reply) => {
    return reply.send(openApiDocument);
  });

  app.get("/docs", async (_request, reply) => {
    return reply.type("text/html; charset=utf-8").send(`<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Rédeas Agent API</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>SwaggerUIBundle({ url: "/docs/openapi.json", dom_id: "#swagger-ui" });</script>
  </body>
</html>`);
  });
}
