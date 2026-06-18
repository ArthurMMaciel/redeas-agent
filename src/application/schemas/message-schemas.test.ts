import { describe, expect, it } from "vitest";
import { inboundMessageSchema } from "./message-schemas.js";

describe("inboundMessageSchema", () => {
  it("aceita o contrato público", () => {
    const result = inboundMessageSchema.safeParse({
      channel: "web",
      userId: "123e4567-e89b-12d3-a456-426614174000",
      conversationId: "conversation-123",
      message: {
        id: "msg-123",
        timestamp: "2026-06-18T20:00:00Z",
        type: "text",
        content: "Quero saber quanto já gastei em sementes"
      }
    });

    expect(result.success).toBe(true);
  });

  it("rejeita userId inválido e campos extras", () => {
    const result = inboundMessageSchema.safeParse({
      channel: "web",
      userId: "usuario-123",
      conversationId: "conversation-123",
      extra: true,
      message: {
        id: "msg-123",
        timestamp: "invalid",
        type: "video",
        content: ""
      }
    });

    expect(result.success).toBe(false);
  });
});
