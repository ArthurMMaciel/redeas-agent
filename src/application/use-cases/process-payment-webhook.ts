import type { WhatsAppGateway } from "../ports/messaging.js";
import type {
  CheckoutIntentRepository,
  FarmRepository,
  PlanRepository,
  SubscriptionRepository,
  UserRepository
} from "../ports/repositories.js";
import { paymentWebhookSchema } from "../schemas/checkout-schemas.js";

const welcomeMessage = "Olá, sou rédeas, seu agente de controle financeiro e rotina agro.";

export class ProcessPaymentWebhookUseCase {
  constructor(
    private readonly checkoutIntents: CheckoutIntentRepository,
    private readonly plans: PlanRepository,
    private readonly users: UserRepository,
    private readonly farms: FarmRepository,
    private readonly subscriptions: SubscriptionRepository,
    private readonly whatsApp: WhatsAppGateway
  ) {}

  async execute(rawInput: unknown) {
    const input = paymentWebhookSchema.parse(rawInput);
    const eventType = input.eventType ?? input.event_type ?? input.status ?? "unknown";
    const gateway = input.gateway;
    const gatewayCheckoutId =
      input.gatewayCheckoutId ?? input.gateway_checkout_id ?? input.externalId ?? input.external_id;
    const gatewayPaymentId = input.gatewayPaymentId ?? input.gateway_payment_id ?? null;

    await this.checkoutIntents.savePaymentEvent({
      gateway,
      externalId: gatewayCheckoutId ?? null,
      eventType,
      payload: rawInput
    });

    if (!isPaidEvent(eventType, input.status)) {
      return { accepted: true, provisioned: false, reason: "ignored_non_paid_event" };
    }

    if (!gatewayCheckoutId) {
      return { accepted: false, provisioned: false, reason: "missing_gateway_checkout_id" };
    }

    const checkoutIntent = await this.checkoutIntents.findByGatewayCheckoutId({
      gateway,
      gatewayCheckoutId
    });
    if (!checkoutIntent) {
      return { accepted: false, provisioned: false, reason: "checkout_intent_not_found" };
    }

    if (checkoutIntent.createdUserId && checkoutIntent.createdFarmId) {
      return {
        accepted: true,
        provisioned: false,
        reason: "already_provisioned",
        userId: checkoutIntent.createdUserId,
        farmId: checkoutIntent.createdFarmId
      };
    }

    const paidIntent =
      checkoutIntent.status === "paid"
        ? checkoutIntent
        : await this.checkoutIntents.markPaid({
            checkoutIntentId: checkoutIntent.id,
            gatewayPaymentId,
            rawGatewayPayload: rawInput
          });

    const plan = await this.plans.findById(paidIntent.planId);
    if (!plan) {
      throw new Error("Paid checkout references a missing plan");
    }

    const user = await this.users.upsertPaidUser({
      phone: paidIntent.phone,
      name: paidIntent.name,
      email: paidIntent.email
    });

    const existingFarm = await this.farms.findDefaultByUserId(user.id);
    const farm =
      existingFarm ??
      (await this.farms.create({
        ownerUserId: user.id,
        name: paidIntent.farmName,
        city: paidIntent.city,
        state: paidIntent.state,
        mainActivity: paidIntent.mainActivity
      }));

    await this.subscriptions.createOrReplaceActive({
      userId: user.id,
      planId: plan.id,
      gateway,
      gatewaySubscriptionId: gatewayCheckoutId,
      currentPeriodStartsAt: new Date()
    });

    await this.checkoutIntents.attachProvisionedResources({
      checkoutIntentId: paidIntent.id,
      userId: user.id,
      farmId: farm.id
    });

    await this.whatsApp.sendText({
      phone: user.phone,
      text: welcomeMessage
    });

    return { accepted: true, provisioned: true, userId: user.id, farmId: farm.id };
  }
}

function isPaidEvent(eventType: string, status: string | undefined): boolean {
  const normalizedEvent = eventType.toLowerCase();
  const normalizedStatus = status?.toLowerCase();

  return (
    normalizedEvent.includes("paid") ||
    normalizedEvent.includes("approved") ||
    normalizedStatus === "paid" ||
    normalizedStatus === "approved"
  );
}
