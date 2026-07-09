import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { buildContainer } from "../../composition/container.js";

let container: ReturnType<typeof buildContainer> | null = null;

function getContainer() {
  container ??= buildContainer();
  return container;
}

export function registerCheckoutRoutes(app: FastifyInstance) {
  app.post("/api/v1/checkouts", async (request, reply) => {
    try {
      const result = await getContainer().createCheckout.execute(request.body);
      return reply.code(201).send({
        success: true,
        data: result
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          success: false,
          error: {
            code: "invalid_payload",
            message: "Payload inválido.",
            issues: error.flatten()
          }
        });
      }

      throw error;
    }
  });
}

