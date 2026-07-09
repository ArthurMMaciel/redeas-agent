import type { PaymentGateway } from "../ports/payment.js";
import type { CheckoutIntentRepository, PlanRepository } from "../ports/repositories.js";
import { createCheckoutSchema } from "../schemas/checkout-schemas.js";
import { normalizeBrazilianPhone } from "../../shared/phone.js";

export class CreateCheckoutUseCase {
  constructor(
    private readonly plans: PlanRepository,
    private readonly checkoutIntents: CheckoutIntentRepository,
    private readonly payments: PaymentGateway,
    private readonly appBaseUrl: string
  ) {}

  async execute(rawInput: unknown) {
    const input = createCheckoutSchema.parse(rawInput);
    const plan = await this.plans.findByCode(input.planCode);
    if (!plan) {
      throw new Error("Plan not found");
    }

    const checkoutIntent = await this.checkoutIntents.create({
      plan,
      name: input.name,
      phone: normalizeBrazilianPhone(input.phone),
      email: input.email ?? null,
      farmName: input.farmName,
      city: input.city,
      state: input.state,
      mainActivity: input.mainActivity,
      gateway: "pagarme"
    });

    const checkout = await this.payments.createCheckout({
      checkoutIntentId: checkoutIntent.id,
      planCode: plan.code,
      planName: plan.name,
      amountCents: plan.priceCents,
      customerName: input.name,
      customerEmail: input.email ?? null,
      customerPhone: checkoutIntent.phone,
      successUrl: `${this.appBaseUrl}/pagamento/aprovado`,
      cancelUrl: `${this.appBaseUrl}/pagamento/cancelado`
    });

    const updated = await this.checkoutIntents.attachGatewayCheckout({
      checkoutIntentId: checkoutIntent.id,
      gatewayCheckoutId: checkout.externalId,
      checkoutUrl: checkout.url
    });

    return {
      checkoutIntentId: updated.id,
      planCode: updated.planCode,
      checkoutUrl: updated.checkoutUrl
    };
  }
}
