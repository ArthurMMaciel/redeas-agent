import type { IncomingWhatsAppMessage, WhatsAppGateway } from "../ports/messaging.js";
import type { FarmRepository, UserRepository } from "../ports/repositories.js";
import {
  parseQuickSignup,
  parseTransactionMessage
} from "../services/financial-message-parser.js";
import type { CreateTransactionUseCase } from "./create-transaction.js";

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
            "Plano gratis ativo: limite de 5 lancamentos por dia.",
            "Agora voce ja pode registrar algo como: gastei 500 em manutencao."
          ].join("\n")
        });
        await this.whatsApp.markMessageProcessed(message.providerMessageId);
        return;
      }

      await this.whatsApp.sendText({
        phone: message.phone,
        text: [
          "Ola! Eu sou seu assistente financeiro agricola.",
          "Vou te ajudar a controlar gastos, ganhos, planejamento de safra, cartoes e alertas de limite.",
          "Para criar seu cadastro, responda neste formato:",
          "cadastro Seu Nome | Nome da Fazenda | Cidade/UF | Cultura principal",
          "Exemplo: cadastro Joao Silva | Fazenda Santa Maria | Cascavel/PR | soja"
        ].join("\n")
      });
      await this.whatsApp.markMessageProcessed(message.providerMessageId);
      return;
    }

    const farm = await this.farms.findDefaultByUserId(user.id);
    if (!farm) {
      await this.whatsApp.sendText({
        phone: message.phone,
        text: "Seu usuario existe, mas ainda falta cadastrar a fazenda. Envie: fazenda Nome | Cidade/UF | Cultura principal"
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
        "Recebi sua mensagem, mas ainda nao consegui transformar em lancamento.",
        "Tente algo como: gastei 500 em manutencao ou recebi 12 mil da venda de milho."
      ].join("\n")
    });
    await this.whatsApp.markMessageProcessed(message.providerMessageId);
  }
}

function buildTransactionConfirmation(
  transaction: NonNullable<ReturnType<typeof parseTransactionMessage>>,
  budgetStatus: Awaited<ReturnType<CreateTransactionUseCase["execute"]>>["budgetStatus"]
): string {
  const typeLabel = transaction.type === "income" ? "Entrada" : "Saida";
  const lines = [
    `${typeLabel} registrada: ${formatMoney(transaction.amountCents)}.`,
    `Categoria: ${transaction.category}.`,
    `Data: ${transaction.occurredOn.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}.`
  ];

  if (budgetStatus) {
    lines.push(
      `Planejado: ${formatMoney(budgetStatus.plannedAmountCents)}. Gasto atual: ${formatMoney(
        budgetStatus.spentAmountCents
      )}. Consumo: ${budgetStatus.consumedPercent.toFixed(1)}%.`
    );

    if (budgetStatus.alertLevel === "over") {
      lines.push(`Alerta: passou do planejado em ${formatMoney(budgetStatus.exceededAmountCents)}.`);
    } else if (budgetStatus.alertLevel !== "none") {
      lines.push(`Atencao: nivel de alerta ${budgetStatus.alertLevel}.`);
    }
  }

  return lines.join("\n");
}

function formatMoney(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(cents / 100);
}
