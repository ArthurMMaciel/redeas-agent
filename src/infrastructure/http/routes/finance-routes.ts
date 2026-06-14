import type { FastifyInstance } from "fastify";

export function registerFinanceRoutes(app: FastifyInstance) {
  app.post("/transactions", async (_request, reply) => {
    return reply.code(501).send({
      error: "not_implemented",
      message: "A criação de transações será conectada após a integração completa dos repositórios."
    });
  });

  app.post("/crop-plans", async (_request, reply) => {
    return reply.code(501).send({
      error: "not_implemented",
      message: "A criação de planejamentos de safra será conectada após a integração completa dos repositórios."
    });
  });
}
