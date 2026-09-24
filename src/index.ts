import { env } from "./infrastructure/config/env.js";
import { buildServer } from "./infrastructure/http/server.js";
import { schedulePersonalFinanceDailySummaryJob } from "./infrastructure/jobs/personal-finance-daily-summary-job.js";
import { PersonalFinanceService } from "./infrastructure/personal-finance/personal-finance-service.js";
import { WahaClient } from "./infrastructure/waha/waha-client.js";

const app = buildServer();

if (env.PERSONAL_FINANCE_DAILY_SUMMARY_ENABLED) {
  schedulePersonalFinanceDailySummaryJob({
    personalFinance: new PersonalFinanceService(),
    whatsApp: new WahaClient()
  });
}

await app.listen({ port: env.PORT, host: "0.0.0.0" });
