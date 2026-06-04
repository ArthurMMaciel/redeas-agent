import { env } from "../config/env.js";
import type { PaymentGateway } from "../../application/ports/payment.js";

export class PagarmeGateway implements PaymentGateway {
  async createPaymentLink(input: {
    userId: string;
    planCode: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string; externalId: string }> {
    if (!env.PAGARME_API_KEY) {
      throw new Error("Pagar.me API key is not configured");
    }

    return {
      url: `${env.APP_BASE_URL}/billing/checkout-placeholder?plan=${input.planCode}&user=${input.userId}`,
      externalId: `placeholder_${input.userId}_${input.planCode}`
    };
  }
}

