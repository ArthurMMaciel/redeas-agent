import { UsageLimitExceededError } from "../errors.js";

export const FREE_PLAN_DAILY_TRANSACTION_LIMIT = 5;

export interface UsageSnapshot {
  subscriptionStatus: "free" | "trialing" | "active" | "past_due" | "canceled";
  transactionsCreatedToday: number;
}

export function assertCanCreateTransaction(snapshot: UsageSnapshot): void {
  if (
    snapshot.subscriptionStatus === "free" &&
    snapshot.transactionsCreatedToday >= FREE_PLAN_DAILY_TRANSACTION_LIMIT
  ) {
    throw new UsageLimitExceededError(FREE_PLAN_DAILY_TRANSACTION_LIMIT);
  }
}

