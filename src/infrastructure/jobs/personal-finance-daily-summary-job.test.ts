import { describe, expect, it, vi } from "vitest";
import { env } from "../config/env.js";
import { sendPersonalFinanceDailySummary } from "./personal-finance-daily-summary-job.js";

describe("sendPersonalFinanceDailySummary", () => {
  it("envia resumo diario para o telefone e sessao configurados", async () => {
    const originalPhone = env.PERSONAL_FINANCE_DAILY_SUMMARY_PHONE;
    const originalSession = env.PERSONAL_FINANCE_DAILY_SUMMARY_SESSION;
    env.PERSONAL_FINANCE_DAILY_SUMMARY_PHONE = "5544998581299";
    env.PERSONAL_FINANCE_DAILY_SUMMARY_SESSION = "Arthur-Redeas-2";

    const personalFinance = {
      buildDailySummaryMessage: vi.fn().mockResolvedValue("Resumo do mes ate hoje:\nTotal: R$ 10,00")
    };
    const whatsApp = {
      sendText: vi.fn().mockResolvedValue({
        status: 200,
        statusText: "OK",
        requestedChatId: "5544998581299",
        resolvedChatId: "5544998581299@c.us",
        body: "{}",
        bodyLength: 2,
        headers: {}
      })
    };

    try {
      const result = await sendPersonalFinanceDailySummary({
        personalFinance,
        whatsApp
      });

      expect(result).toEqual({
        sent: true,
        phone: "5544998581299",
        session: "Arthur-Redeas-2"
      });
      expect(whatsApp.sendText).toHaveBeenCalledWith({
        phone: "5544998581299",
        session: "Arthur-Redeas-2",
        text: "Resumo do mes ate hoje:\nTotal: R$ 10,00"
      });
    } finally {
      env.PERSONAL_FINANCE_DAILY_SUMMARY_PHONE = originalPhone;
      env.PERSONAL_FINANCE_DAILY_SUMMARY_SESSION = originalSession;
    }
  });
});
