import { describe, expect, it, vi } from "vitest";
import type { Plan } from "../../domain/entities.js";
import type { CheckoutIntentRepository, PlanRepository } from "../ports/repositories.js";
import type { PaymentGateway } from "../ports/payment.js";
import { moneyCents } from "../../shared/types.js";
import { CreateCheckoutUseCase } from "./create-checkout.js";

const plan = {
  id: "plan-1",
  code: "finance_basic",
  name: "Controle Financeiro",
  priceCents: moneyCents(2590),
  currency: "BRL",
  dailyTransactionLimit: null,
  activeCropPlanLimit: 0,
  canReceiveDailyReport: false,
  hasFinancialControl: true,
  hasAgenda: true,
  hasCropPlanning: false
} as Plan;

describe("CreateCheckoutUseCase", () => {
  it("cria uma intenção de checkout para o plano escolhido na landing", async () => {
    const plans: PlanRepository = {
      findByCode: vi.fn().mockResolvedValue(plan),
      findById: vi.fn()
    };
    const checkoutIntents: CheckoutIntentRepository = {
      create: vi.fn().mockResolvedValue({
        id: "checkout-1",
        phone: "5544999999999"
      }),
      attachGatewayCheckout: vi.fn().mockResolvedValue({
        id: "checkout-1",
        planCode: "finance_basic",
        checkoutUrl: "https://checkout.example/1"
      }),
      findByGatewayCheckoutId: vi.fn(),
      markPaid: vi.fn(),
      attachProvisionedResources: vi.fn(),
      savePaymentEvent: vi.fn()
    } as never;
    const payments: PaymentGateway = {
      createCheckout: vi.fn().mockResolvedValue({
        externalId: "gateway-checkout-1",
        url: "https://checkout.example/1"
      })
    };

    const useCase = new CreateCheckoutUseCase(
      plans,
      checkoutIntents,
      payments,
      "https://redeas.com.br"
    );

    const result = await useCase.execute({
      planCode: "finance_basic",
      name: "João Silva",
      phone: "(44) 99999-9999",
      email: "joao@example.com",
      farmName: "Fazenda Modelo",
      city: "Cascavel",
      state: "pr",
      mainActivity: "soja"
    });

    expect(checkoutIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        plan,
        phone: "5544999999999",
        state: "PR"
      })
    );
    expect(payments.createCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        checkoutIntentId: "checkout-1",
        planCode: "finance_basic",
        amountCents: 2590
      })
    );
    expect(result.checkoutUrl).toBe("https://checkout.example/1");
  });
});
