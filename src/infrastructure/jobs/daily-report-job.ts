import cron from "node-cron";
import { BRAZIL_TIME_ZONE } from "../../shared/types.js";
import type { GenerateDailyReportUseCase } from "../../application/use-cases/generate-daily-report.js";
import { logger } from "../logger.js";

export function scheduleDailyReportJob(useCase: GenerateDailyReportUseCase) {
  return cron.schedule(
    "0 7 * * *",
    async () => {
      try {
        const result = await useCase.execute();
        logger.info({ sent: result.sent }, "Daily reports sent");
      } catch (error) {
        logger.error({ error }, "Daily report job failed");
      }
    },
    { timezone: BRAZIL_TIME_ZONE }
  );
}

