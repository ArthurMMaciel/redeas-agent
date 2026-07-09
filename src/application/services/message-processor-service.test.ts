import { describe, expect, it, vi } from "vitest";
import type { Farm, User } from "../../domain/entities.js";
import type { ProcessedMessageRepository } from "../ports/messaging.js";
import type { FarmRepository, UserRepository } from "../ports/repositories.js";
import { MessageProcessorService } from "./message-processor-service.js";

const user = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  phone: "5544999999999",
  email: null,
  name: "João",
  subscriptionStatus: "active",
  createdAt: new Date(),
  deletedAt: null
} as User;

const farm = {
  id: "223e4567-e89b-12d3-a456-426614174000",
  ownerUserId: user.id,
  name: "Fazenda Modelo",
  city: "Cascavel",
  state: "PR",
  mainActivity: "soja",
  createdAt: new Date(),
  deletedAt: null
} as Farm;

function createDependencies() {
  const users: UserRepository = {
    findByPhone: vi.fn().mockResolvedValue(user),
    findById: vi.fn().mockResolvedValue(user),
    createFreeUser: vi.fn().mockResolvedValue(user),
    upsertPaidUser: vi.fn().mockResolvedValue(user)
  };
  const farms: FarmRepository = {
    findDefaultByUserId: vi.fn().mockResolvedValue(farm),
    create: vi.fn().mockResolvedValue(farm)
  };
  const processedMessages: ProcessedMessageRepository = {
    wasProcessed: vi.fn().mockResolvedValue(false),
    markProcessed: vi.fn().mockResolvedValue(undefined)
  };
  const createTransaction = {
    execute: vi.fn().mockResolvedValue({ transaction: {}, budgetStatus: null })
  };

  return { users, farms, processedMessages, createTransaction };
}

const input = {
  channel: "web",
  userId: user.id,
  conversationId: "conversation-123",
  message: {
    id: "msg-123",
    timestamp: "2026-06-18T20:00:00Z",
    type: "text" as const,
    content: "gastei R$ 500,00 em manutenção"
  }
};

describe("MessageProcessorService", () => {
  it("processa uma mensagem pública usando o userId", async () => {
    const dependencies = createDependencies();
    const service = new MessageProcessorService(
      dependencies.users,
      dependencies.farms,
      dependencies.processedMessages,
      dependencies.createTransaction as never
    );

    const result = await service.process(input);

    expect(dependencies.users.findById).toHaveBeenCalledWith(user.id);
    expect(dependencies.createTransaction.execute).toHaveBeenCalledOnce();
    expect(dependencies.processedMessages.markProcessed).toHaveBeenCalledWith(
      "msg-123",
      "web"
    );
    expect(result).toMatchObject({
      success: true,
      conversationId: "conversation-123",
      response: {
        actions: [],
        metadata: { duplicate: false, channel: "web" }
      }
    });
  });

  it("não executa novamente uma mensagem duplicada", async () => {
    const dependencies = createDependencies();
    vi.mocked(dependencies.processedMessages.wasProcessed).mockResolvedValue(true);
    const service = new MessageProcessorService(
      dependencies.users,
      dependencies.farms,
      dependencies.processedMessages
    );

    const result = await service.process(input);

    expect(dependencies.users.findById).not.toHaveBeenCalled();
    expect(result.response.metadata.duplicate).toBe(true);
  });

  it("aceita os tipos multimídia sem executar lançamento financeiro", async () => {
    const dependencies = createDependencies();
    const service = new MessageProcessorService(
      dependencies.users,
      dependencies.farms,
      dependencies.processedMessages
    );

    const result = await service.process({
      ...input,
      message: { ...input.message, type: "audio" }
    });

    expect(dependencies.createTransaction.execute).not.toHaveBeenCalled();
    expect(result.response.metadata.processingStatus).toBe("accepted");
    expect(dependencies.processedMessages.markProcessed).toHaveBeenCalledWith(
      "msg-123",
      "web"
    );
  });

  it("resolve a identidade do WhatsApp por telefone", async () => {
    const dependencies = createDependencies();
    const service = new MessageProcessorService(
      dependencies.users,
      dependencies.farms,
      dependencies.processedMessages
    );

    await service.process({
      channel: "whatsapp",
      conversationId: user.phone,
      identity: { phone: user.phone },
      message: {
        ...input.message,
        id: "waha-123",
        content: "mensagem sem lançamento"
      }
    });

    expect(dependencies.users.findByPhone).toHaveBeenCalledWith(user.phone);
  });
});
