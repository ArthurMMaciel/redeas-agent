import type { IncomingWhatsAppMessage, WhatsAppGateway } from "../ports/messaging.js";
import type { FarmRepository, UserRepository } from "../ports/repositories.js";
import {
  parseQuickSignup,
  parseTransactionMessage
} from "../services/financial-message-parser.js";
import type { CreateTransactionUseCase } from "./create-transaction.js";
import { formatAgriculturalCategory, formatMoneyBRL, formatPercentBR } from "../../shared/formatters.js";

export class RegisterWhatsAppMessageUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly farms: FarmRepository,
    private readonly whatsApp: WhatsAppGateway,
    private readonly createTransaction?: CreateTransactionUseCase
  ) {}

  async execute(message: IncomingWhatsAppMessage): Promise<void> {
    if (await this.whatsApp.wasMessageProcessed(message.providerMessageId)) {
      return;
    }

    const user = await this.users.findByPhone(message.phone);
    if (!user) {
      const signup = parseQuickSignup(message.text);
      if (signup) {
        const createdUser = await this.users.createFreeUser({
          phone: message.phone,
          name: signup.name
        });
        await this.farms.create({
          ownerUserId: createdUser.id,
          name: signup.farmName,
          city: signup.city,
          state: signup.state,
          mainActivity: signup.mainActivity
        });
        await this.whatsApp.sendText({
          phone: message.phone,
          text: [
            `Cadastro criado para ${signup.name}.`,
            `Fazenda: ${signup.farmName} - ${signup.city}/${signup.state}.`,
            "Plano grátis ativo: limite de 5 lançamentos por dia.",
            "Agora você já pode registrar algo como: gastei R$ 500,00 em manutenção."
          ].join("\n")
        });
        await this.whatsApp.markMessageProcessed(message.providerMessageId);
        return;
      }

      await this.whatsApp.sendText({
        phone: message.phone,
        text: [
          "Olá! Eu sou seu assistente financeiro agrícola.",
          "Vou te ajudar a controlar gastos, ganhos, planejamento de safra, cartões e alertas de limite.",
          "Para criar seu cadastro, responda neste formato:",
          "cadastro Seu Nome | Nome da Fazenda | Cidade/UF | Cultura principal",
          "Exemplo: cadastro João Silva | Fazenda Santa Maria | Cascavel/PR | soja"
        ].join("\n")
      });
      await this.whatsApp.markMessageProcessed(message.providerMessageId);
      return;
    }

    const farm = await this.farms.findDefaultByUserId(user.id);
    if (!farm) {
      await this.whatsApp.sendText({
        phone: message.phone,
        text: "Seu usuário existe, mas ainda falta cadastrar a fazenda. Envie: fazenda Nome | Cidade/UF | Cultura principal"
      });
      await this.whatsApp.markMessageProcessed(message.providerMessageId);
      return;
    }

    const parsedTransaction = parseTransactionMessage(message.text, message.receivedAt);
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

      await this.whatsApp.sendText({
        phone: message.phone,
        text: buildTransactionConfirmation(parsedTransaction, result.budgetStatus)
      });
      await this.whatsApp.markMessageProcessed(message.providerMessageId);
      return;
    }

    await this.whatsApp.sendText({
      phone: message.phone,
      text: [
        "Recebi sua mensagem, mas ainda não consegui transformar em lançamento.",
        "Tente algo como: gastei R$ 500,00 em manutenção ou recebi R$ 12.000,00 da venda de milho."
      ].join("\n")
    });
    await this.whatsApp.markMessageProcessed(message.providerMessageId);
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
    `Data: ${transaction.occurredOn.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}.`
  ];

  if (budgetStatus) {
    lines.push(
      `Planejado: ${formatMoneyBRL(budgetStatus.plannedAmountCents)}. Gasto atual: ${formatMoneyBRL(
        budgetStatus.spentAmountCents
      )}. Consumo: ${formatPercentBR(budgetStatus.consumedPercent)}.`
    );

    if (budgetStatus.alertLevel === "over") {
      lines.push(`Alerta: passou do planejado em ${formatMoneyBRL(budgetStatus.exceededAmountCents)}.`);
    } else if (budgetStatus.alertLevel !== "none") {
      lines.push(`Atenção: nível de alerta ${budgetStatus.alertLevel}.`);
    }
  }

  return lines.join("\n");
}
