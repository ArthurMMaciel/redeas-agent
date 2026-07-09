import { env } from "../config/env.js";
import type { PaymentGateway } from "../../application/ports/payment.js";

export class PagarmeGateway implements PaymentGateway {
  async createCheckout(input: {
    checkoutIntentId: string;
    planCode: string;
    planName: string;
    amountCents: number;
    customerName: string;
    customerEmail?: string | null;
    customerPhone: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string; externalId: string }> {
    if (!env.PAGARME_API_KEY) {
      throw new Error("Pagar.me API key is not configured");
    }

    return {
      url: `${env.APP_BASE_URL}/billing/checkout-placeholder?plan=${input.planCode}&checkout=${input.checkoutIntentId}`,
      externalId: `placeholder_${input.checkoutIntentId}`
    };
  }
}
