import { z } from "zod";
import { MESSAGE_TYPES } from "../dtos/message-dtos.js";

export const inboundMessageSchema = z
  .object({
    channel: z.string().trim().min(1).max(50),
    userId: z.string().uuid(),
    conversationId: z.string().trim().min(1).max(255),
    message: z
      .object({
        id: z.string().trim().min(1).max(255),
        timestamp: z.string().datetime({ offset: true }),
        type: z.enum(MESSAGE_TYPES),
        content: z.string().trim().min(1)
      })
      .strict()
  })
  .strict();

export const agentResponseSchema = z.object({
  success: z.boolean(),
  conversationId: z.string(),
  response: z.object({
    message: z.string(),
    actions: z.array(z.unknown()),
    metadata: z.record(z.unknown())
  })
});

export type ValidatedInboundMessage = z.infer<typeof inboundMessageSchema>;
