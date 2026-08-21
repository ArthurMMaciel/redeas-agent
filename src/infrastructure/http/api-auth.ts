import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../config/env.js";

export function authorizeApiRequest(
  request: FastifyRequest,
  reply: FastifyReply
): boolean {
  if (!env.AGENT_API_KEY) {
    return true;
  }

  const authorization = request.headers.authorization;
  const bearer = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;
  const apiKey = firstHeader(request.headers["x-api-key"]);

  if (bearer === env.AGENT_API_KEY || apiKey === env.AGENT_API_KEY) {
    return true;
  }

  reply.code(401).send({
    success: false,
    error: { code: "unauthorized", message: "API key invalida ou ausente." }
  });
  return false;
}

function firstHeader(value: string | string[] | undefined): string | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}
