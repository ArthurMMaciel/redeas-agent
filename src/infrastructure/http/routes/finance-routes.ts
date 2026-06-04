import type { FastifyInstance } from "fastify";

export function registerFinanceRoutes(app: FastifyInstance) {
  app.post("/transactions", async (_request, reply) => {
    return reply.code(501).send({
      error: "not_implemented",
      message: "CreateTransactionUseCase will be wired after repository adapters are connected."
    });
  });

  app.post("/crop-plans", async (_request, reply) => {
    return reply.code(501).send({
      error: "not_implemented",
      message: "CreateCropPlanUseCase will be wired after repository adapters are connected."
    });
  });
}

