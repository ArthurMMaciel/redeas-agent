export interface PaymentGateway {
  createPaymentLink(input: {
    userId: string;
    planCode: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string; externalId: string }>;
}

