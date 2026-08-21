import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { buildContainer } from "../../composition/container.js";
import { authorizeApiRequest } from "../api-auth.js";

const welcomeMessageSchema = z
  .object({
    phone: z.string().trim().min(10).max(32)
  })
  .strict();

let container: ReturnType<typeof buildContainer> | null = null;

function getContainer() {
  container ??= buildContainer();
  return container;
}

export function registerWelcomeRoutes(app: FastifyInstance) {
  app.post("/api/v1/welcome-messages", async (request, reply) => {
    if (!authorizeApiRequest(request, reply)) {
      return;
    }

    const parsed = welcomeMessageSchema.safeParse(request.body);
    if (!parsed.success) {
      request.log.warn(
        { issues: parsed.error.issues },
        "Rejected invalid welcome message request"
      );
      return reply.code(400).send({
        success: false,
        error: {
          code: "invalid_payload",
          message: "Payload invalido.",
          issues: parsed.error.flatten()
        }
      });
    }

    const chatId = normalizeBrazilianWhatsAppChatId(parsed.data.phone);
    if (!chatId) {
      return reply.code(400).send({
        success: false,
        error: {
          code: "invalid_phone",
          message: "Telefone invalido. Envie um numero brasileiro com DDD."
        }
      });
    }

    const text = buildWelcomeMessage();
    const result = await getContainer().whatsApp.sendText({ phone: chatId, text });

    request.log.info(
      {
        channel: "whatsapp",
        endpoint: "/api/v1/welcome-messages",
        requestedPhone: parsed.data.phone,
        chatId,
        status: result.status,
        resolvedChatId: result.resolvedChatId
      },
      "Welcome WhatsApp message sent"
    );

    return reply.code(202).send({
      success: true,
      data: {
        messageSent: true,
        requestedPhone: parsed.data.phone,
        chatId,
        resolvedChatId: result.resolvedChatId,
        status: result.status
      }
    });
  });
}

export function buildWelcomeMessage(): string {
  return [
    "Ol\u00e1, sou o R\u00e9deas, seu agente de controle financeiro e rotina agro.",
    "Seu acesso j\u00e1 est\u00e1 ativo.",
    "Para come\u00e7ar, me envie uma mensagem assim: Redeas gastei R$ 50 em diesel"
  ].join("\n\n");
}

export function normalizeBrazilianWhatsAppChatId(rawPhone: string): string | null {
  if (rawPhone.endsWith("@c.us") || rawPhone.endsWith("@s.whatsapp.net")) {
    return rawPhone;
  }

  const digits = rawPhone.replace(/\D/g, "");
  const phoneWithCountryCode =
    digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;

  if (!/^55\d{10,11}$/.test(phoneWithCountryCode)) {
    return null;
  }

  return `${phoneWithCountryCode}@c.us`;
}
