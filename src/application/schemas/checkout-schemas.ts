import { z } from "zod";

export const paidPlanCodes = ["finance_basic", "finance_safra"] as const;

export const createCheckoutSchema = z.object({
  planCode: z.enum(paidPlanCodes),
  name: z.string().trim().min(2).max(160),
  phone: z.string().trim().min(10).max(32),
  email: z.string().trim().email().optional().nullable(),
  farmName: z.string().trim().min(2).max(160),
  city: z.string().trim().min(2).max(120),
  state: z.string().trim().min(2).max(2).transform((value) => value.toUpperCase()),
  mainActivity: z.string().trim().min(2).max(120)
});

export type CreateCheckoutInput = z.input<typeof createCheckoutSchema>;

export const paymentWebhookSchema = z
  .object({
    eventType: z.string().trim().min(1).optional(),
    event_type: z.string().trim().min(1).optional(),
    status: z.string().trim().optional(),
    gateway: z.string().trim().min(1).default("pagarme"),
    gatewayCheckoutId: z.string().trim().min(1).optional(),
    gateway_checkout_id: z.string().trim().min(1).optional(),
    externalId: z.string().trim().min(1).optional(),
    external_id: z.string().trim().min(1).optional(),
    gatewayPaymentId: z.string().trim().min(1).optional(),
    gateway_payment_id: z.string().trim().min(1).optional()
  })
  .passthrough();

export type PaymentWebhookInput = z.input<typeof paymentWebhookSchema>;

