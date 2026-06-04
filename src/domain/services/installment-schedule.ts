import { moneyCents, type MoneyCents } from "../../shared/types.js";

export interface InstallmentScheduleItem {
  number: number;
  amountCents: MoneyCents;
  dueOn: Date;
}

export function createInstallmentSchedule(
  totalAmountCents: MoneyCents,
  installmentsCount: number,
  firstDueOn: Date
): InstallmentScheduleItem[] {
  if (!Number.isInteger(installmentsCount) || installmentsCount <= 0) {
    throw new Error("Installments count must be a positive integer");
  }

  const total = totalAmountCents as number;
  const baseAmount = Math.floor(total / installmentsCount);
  const remainder = total % installmentsCount;

  return Array.from({ length: installmentsCount }, (_, index) => {
    const dueOn = new Date(firstDueOn);
    dueOn.setUTCMonth(firstDueOn.getUTCMonth() + index);

    return {
      number: index + 1,
      amountCents: moneyCents(baseAmount + (index < remainder ? 1 : 0)),
      dueOn
    };
  });
}

