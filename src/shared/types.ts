export type Brand<T, Name extends string> = T & { readonly __brand: Name };

export type UserId = Brand<string, "UserId">;
export type FarmId = Brand<string, "FarmId">;
export type CropPlanId = Brand<string, "CropPlanId">;
export type BudgetItemId = Brand<string, "BudgetItemId">;
export type TransactionId = Brand<string, "TransactionId">;
export type CardId = Brand<string, "CardId">;
export type InstallmentPurchaseId = Brand<string, "InstallmentPurchaseId">;
export type PlanId = Brand<string, "PlanId">;
export type CheckoutIntentId = Brand<string, "CheckoutIntentId">;
export type ScheduledEventId = Brand<string, "ScheduledEventId">;

export type MoneyCents = Brand<number, "MoneyCents">;

export function moneyCents(value: number): MoneyCents {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error("Money must be a non-negative integer in cents");
  }

  return value as MoneyCents;
}

export const BRAZIL_TIME_ZONE = "America/Sao_Paulo";
