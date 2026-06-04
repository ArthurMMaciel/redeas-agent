import type { MoneyCents } from "../../shared/types.js";

export type BudgetAlertLevel = "none" | "fifty" | "eighty" | "full" | "over";

export interface BudgetStatus {
  plannedAmountCents: MoneyCents;
  spentAmountCents: MoneyCents;
  remainingAmountCents: number;
  consumedPercent: number;
  alertLevel: BudgetAlertLevel;
  exceededAmountCents: number;
}

export function calculateBudgetStatus(
  plannedAmountCents: MoneyCents,
  spentAmountCents: MoneyCents
): BudgetStatus {
  const planned = plannedAmountCents as number;
  const spent = spentAmountCents as number;
  const consumedPercent = planned === 0 ? 0 : (spent / planned) * 100;
  const exceededAmountCents = Math.max(0, spent - planned);

  let alertLevel: BudgetAlertLevel = "none";
  if (planned > 0 && spent > planned) {
    alertLevel = "over";
  } else if (planned > 0 && spent === planned) {
    alertLevel = "full";
  } else if (consumedPercent >= 80) {
    alertLevel = "eighty";
  } else if (consumedPercent >= 50) {
    alertLevel = "fifty";
  }

  return {
    plannedAmountCents,
    spentAmountCents,
    remainingAmountCents: planned - spent,
    consumedPercent,
    alertLevel,
    exceededAmountCents
  };
}

