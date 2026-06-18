import type {
  AgentResponseDTO,
  MessageProcessingInput
} from "../dtos/message-dtos.js";
import type { ProcessedMessageRepository } from "../ports/messaging.js";
import type { FarmRepository, UserRepository } from "../ports/repositories.js";
import {
  parseQuickSignup,
  parseTransactionMessage
} from "./financial-message-parser.js";
import type { CreateTransactionUseCase } from "../use-cases/create-transaction.js";
import {
  formatAgriculturalCategory,
  formatMoneyBRL,
  formatPercentBR
} from "../../shared/formatters.js";
import type { UserId } from "../../shared/types.js";

export class MessageProcessingError extends Error {
  constructor(
    readonly code: "user_not_found" | "missing_identity",
    message: string
  ) {
    super(message);
    this.name = "MessageProcessingError";
  }
}

export class MessageProcessorService {
  constructor(
    private readonly users: UserRepository,
    private readonly farms: FarmRepository,
    private readonly processedMessages: ProcessedMessageRepository,
    private readonly createTransaction?: CreateTransactionUseCase
  ) {}

  async process(input: MessageProcessingInput): Promise<AgentResponseDTO> {
    const logContext = {
      channel: input.channel,
      conversationId: input.conversationId,
      messageId: input.message.id,
      userId: input.userId
    };

    if (await this.processedMessages.wasProcessed(input.message.id, input.channel)) {
      return this.response(input.conversationId, "Mensagem já processada.", {
        duplicate: true,
        ...logContext
      });
    }

    const phone = input.identity?.phone;
    const user = input.userId
      ? await this.users.findById(input.userId as UserId)
      : phone
        ? await this.users.findByPhone(phone)
        : null;

    if (!user) {
      if (input.channel === "whatsapp" && phone) {
        return this.processUnknownWhatsAppUser(input, phone);
      }

      if (!input.userId && !phone) {
        throw new MessageProcessingError(
          "missing_identity",
          "A mensagem não contém uma identidade de usuário válida."
        );
      }

      throw new MessageProcessingError("user_not_found", "Usuário não encontrado.");
    }

    const farm = await this.farms.findDefaultByUserId(user.id);
    if (!farm) {
      return this.finish(
        input,
        "Seu usuário existe, mas ainda falta cadastrar a fazenda.",
        { userId: user.id }
      );
    }

    if (input.message.type !== "text") {
      return this.finish(
        input,
        `Mensagem do tipo "${input.message.type}" recebida. O conteúdo foi encaminhado para processamento.`,
        {
          userId: user.id,
          farmId: farm.id,
          processingStatus: "accepted"
        }
      );
    }

    const receivedAt = new Date(input.message.timestamp);
    const parsedTransaction = parseTransactionMessage(input.message.content, receivedAt);
    if (parsedTransaction && this.createTransaction) {
      const result = await this.createTransaction.execute({
        userId: user.id,
        farmId: farm.id,
        type: parsedTransaction.type,
        amountCents: parsedTransaction.amountCents,
        description: parsedTransaction.description,
        category: parsedTransaction.category,
        occurredOn: parsedTransaction.occurredOn,
        paymentMethod: parsedTransaction.paymentMethod,
        cardId: null
      });

      return this.finish(
        input,
        buildTransactionConfirmation(parsedTransaction, result.budgetStatus),
        { userId: user.id, farmId: farm.id }
      );
    }

    return this.finish(
      input,
      [
        "Recebi sua mensagem, mas ainda não consegui transformá-la em lançamento.",
        "Tente algo como: gastei R$ 500,00 em manutenção ou recebi R$ 12.000,00 da venda de milho."
      ].join("\n"),
      { userId: user.id, farmId: farm.id }
    );
  }

  private async processUnknownWhatsAppUser(
    input: MessageProcessingInput,
    phone: string
  ): Promise<AgentResponseDTO> {
    const signup = parseQuickSignup(input.message.content);
    if (!signup) {
      return this.finish(
        input,
        [
          "Olá! Eu sou seu assistente financeiro agrícola.",
          "Para criar seu cadastro, responda neste formato:",
          "cadastro Seu Nome | Nome da Fazenda | Cidade/UF | Cultura principal"
        ].join("\n")
      );
    }

    const createdUser = await this.users.createFreeUser({
      phone,
      name: signup.name
    });
    await this.farms.create({
      ownerUserId: createdUser.id,
      name: signup.farmName,
      city: signup.city,
      state: signup.state,
      mainActivity: signup.mainActivity
    });

    return this.finish(
      input,
      [
        `Cadastro criado para ${signup.name}.`,
        `Fazenda: ${signup.farmName} - ${signup.city}/${signup.state}.`,
        "Plano grátis ativo: limite de 5 lançamentos por dia."
      ].join("\n"),
      { userId: createdUser.id }
    );
  }

  private async finish(
    input: MessageProcessingInput,
    message: string,
    metadata: Record<string, unknown> = {}
  ): Promise<AgentResponseDTO> {
    await this.processedMessages.markProcessed(input.message.id, input.channel);
    return this.response(input.conversationId, message, {
      duplicate: false,
      channel: input.channel,
      messageId: input.message.id,
      ...metadata
    });
  }

  private response(
    conversationId: string,
    message: string,
    metadata: Record<string, unknown>
  ): AgentResponseDTO {
    return {
      success: true,
      conversationId,
      response: {
        message,
        actions: [],
        metadata
      }
    };
  }
}

function buildTransactionConfirmation(
  transaction: NonNullable<ReturnType<typeof parseTransactionMessage>>,
  budgetStatus: Awaited<ReturnType<CreateTransactionUseCase["execute"]>>["budgetStatus"]
): string {
  const typeLabel = transaction.type === "income" ? "Entrada" : "Saída";
  const lines = [
    `${typeLabel} registrada: ${formatMoneyBRL(transaction.amountCents)}.`,
    `Categoria: ${formatAgriculturalCategory(transaction.category)}.`,
    `Data: ${transaction.occurredOn.toLocaleDateString("pt-BR", {
      timeZone: "America/Sao_Paulo"
    })}.`
  ];

  if (budgetStatus) {
    lines.push(
      `Planejado: ${formatMoneyBRL(budgetStatus.plannedAmountCents)}. Gasto atual: ${formatMoneyBRL(
        budgetStatus.spentAmountCents
      )}. Consumo: ${formatPercentBR(budgetStatus.consumedPercent)}.`
    );

    if (budgetStatus.alertLevel === "over") {
      lines.push(
        `Alerta: passou do planejado em ${formatMoneyBRL(budgetStatus.exceededAmountCents)}.`
      );
    } else if (budgetStatus.alertLevel !== "none") {
      lines.push(`Atenção: nível de alerta ${budgetStatus.alertLevel}.`);
    }
  }

  return lines.join("\n");
}
