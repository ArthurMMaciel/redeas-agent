export interface PaymentGateway {
  createCheckout(input: {
    checkoutIntentId: string;
    planCode: string;
    planName: string;
    amountCents: number;
    customerName: string;
    customerEmail?: string | null;
    customerPhone: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string; externalId: string }>;
}
