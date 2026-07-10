import { describe, expect, it, vi } from "vitest";
import type { CheckoutIntent, Farm, Plan, User } from "../../domain/entities.js";
import type { WhatsAppGateway } from "../ports/messaging.js";
import type {
  CheckoutIntentRepository,
  FarmRepository,
  PlanRepository,
  SubscriptionRepository,
  UserRepository
} from "../ports/repositories.js";
import { moneyCents } from "../../shared/types.js";
import { ProcessPaymentWebhookUseCase } from "./process-payment-webhook.js";

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

const checkoutIntent = {
  id: "checkout-1",
  planId: plan.id,
  planCode: plan.code,
  name: "João Silva",
  phone: "5544999999999",
  email: "joao@example.com",
  farmName: "Fazenda Modelo",
  city: "Cascavel",
  state: "PR",
  mainActivity: "soja",
  status: "pending",
  gateway: "pagarme",
  gatewayCheckoutId: "gateway-checkout-1",
  gatewayPaymentId: null,
  checkoutUrl: "https://checkout.example/1",
  paidAt: null,
  createdUserId: null,
  createdFarmId: null,
  createdAt: new Date()
} as CheckoutIntent;

const user = {
  id: "user-1",
  phone: checkoutIntent.phone,
  name: checkoutIntent.name,
  email: checkoutIntent.email,
  subscriptionStatus: "active",
  createdAt: new Date(),
  deletedAt: null
} as User;

const farm = {
  id: "farm-1",
  ownerUserId: user.id,
  name: checkoutIntent.farmName,
  city: checkoutIntent.city,
  state: checkoutIntent.state,
  mainActivity: checkoutIntent.mainActivity,
  createdAt: new Date(),
  deletedAt: null
} as Farm;

describe("ProcessPaymentWebhookUseCase", () => {
  it("provisiona usuário pagante e envia a mensagem inicial", async () => {
    const checkoutIntents: CheckoutIntentRepository = {
      create: vi.fn(),
      attachGatewayCheckout: vi.fn(),
      findByGatewayCheckoutId: vi.fn().mockResolvedValue(checkoutIntent),
      markPaid: vi.fn().mockResolvedValue({ ...checkoutIntent, status: "paid" }),
      attachProvisionedResources: vi.fn().mockResolvedValue(undefined),
      savePaymentEvent: vi.fn().mockResolvedValue(undefined)
    } as never;
    const plans: PlanRepository = {
      findByCode: vi.fn(),
      findById: vi.fn().mockResolvedValue(plan)
    };
    const users: UserRepository = {
      findByPhone: vi.fn(),
      findById: vi.fn(),
      createFreeUser: vi.fn(),
      upsertPaidUser: vi.fn().mockResolvedValue(user)
    } as never;
    const farms: FarmRepository = {
      findDefaultByUserId: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(farm)
    };
    const subscriptions: SubscriptionRepository = {
      createOrReplaceActive: vi.fn().mockResolvedValue(undefined)
    };
    const whatsApp: WhatsAppGateway = {
      sendText: vi.fn().mockResolvedValue({ status: 200, body: null })
    };

    const useCase = new ProcessPaymentWebhookUseCase(
      checkoutIntents,
      plans,
      users,
      farms,
      subscriptions,
      whatsApp
    );

    const result = await useCase.execute({
      gateway: "pagarme",
      eventType: "payment.paid",
      gatewayCheckoutId: "gateway-checkout-1",
      gatewayPaymentId: "payment-1"
    });

    expect(checkoutIntents.savePaymentEvent).toHaveBeenCalledOnce();
    expect(users.upsertPaidUser).toHaveBeenCalledWith({
      phone: checkoutIntent.phone,
      name: checkoutIntent.name,
      email: checkoutIntent.email
    });
    expect(farms.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerUserId: user.id,
        name: checkoutIntent.farmName
      })
    );
    expect(subscriptions.createOrReplaceActive).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: user.id,
        planId: plan.id,
        gateway: "pagarme"
      })
    );
    expect(whatsApp.sendText).toHaveBeenCalledWith({
      phone: user.phone,
      text: "Olá, sou rédeas, seu agente de controle financeiro e rotina agro."
    });
    expect(result).toMatchObject({ accepted: true, provisioned: true });
  });
});
