import cron from "node-cron";
import { BRAZIL_TIME_ZONE } from "../../shared/types.js";
import type { WhatsAppGateway } from "../../application/ports/messaging.js";
import { env } from "../config/env.js";
import { logger } from "../logger.js";
import type { PersonalFinanceService } from "../personal-finance/personal-finance-service.js";

export interface PersonalFinanceDailySummaryResult {
  sent: boolean;
  phone: string;
  session: string;
}

export async function sendPersonalFinanceDailySummary(input: {
  personalFinance: Pick<PersonalFinanceService, "buildDailySummaryMessage">;
  whatsApp: WhatsAppGateway;
  now?: Date;
}): Promise<PersonalFinanceDailySummaryResult> {
  const phone = env.PERSONAL_FINANCE_DAILY_SUMMARY_PHONE;
  const session = env.PERSONAL_FINANCE_DAILY_SUMMARY_SESSION;
  const text = await input.personalFinance.buildDailySummaryMessage(input.now ?? new Date());

  await input.whatsApp.sendText({
    phone,
    session,
    text
  });

  return { sent: true, phone, session };
}

export function schedulePersonalFinanceDailySummaryJob(input: {
  personalFinance: PersonalFinanceService;
  whatsApp: WhatsAppGateway;
}) {
  return cron.schedule(
    env.PERSONAL_FINANCE_DAILY_SUMMARY_CRON,
    async () => {
      try {
        const result = await sendPersonalFinanceDailySummary(input);
        logger.info(
          { phone: result.phone, session: result.session },
          "Personal finance daily summary sent"
        );
      } catch (error) {
        logger.error({ error }, "Personal finance daily summary job failed");
      }
    },
    { timezone: BRAZIL_TIME_ZONE }
  );
}
