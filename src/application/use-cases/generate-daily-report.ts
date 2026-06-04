import type { Clock } from "../ports/clock.js";
import type { ReportRepository } from "../ports/repositories.js";
import type { WhatsAppGateway } from "../ports/messaging.js";

export class GenerateDailyReportUseCase {
  constructor(
    private readonly reports: ReportRepository,
    private readonly whatsApp: WhatsAppGateway,
    private readonly clock: Clock
  ) {}

  async execute(): Promise<{ sent: number }> {
    const users = await this.reports.listUsersEligibleForDailyReport();

    for (const user of users) {
      const content = [
        "Bom dia! Resumo financeiro de hoje:",
        "Ainda estou na versao inicial do relatorio automatico.",
        "Em breve vou incluir planejamentos ativos, cartoes, parcelas e alertas."
      ].join("\n");

      await this.whatsApp.sendText({ phone: user.phone, text: content });
      await this.reports.saveDailyReport({ userId: user.id, content, sentAt: this.clock.now() });
    }

    return { sent: users.length };
  }
}

