import { createInstallmentSchedule } from "../../domain/services/installment-schedule.js";
import { moneyCents } from "../../shared/types.js";
import type { InstallmentPurchaseRepository } from "../ports/repositories.js";

export interface CreateInstallmentPurchaseInput {
  farmId: string;
  userId: string;
  cardId: string;
  description: string;
  category: string;
  totalAmountCents: number;
  installmentsCount: number;
  firstDueOn: Date;
  cropPlanId: string | null;
}

export class CreateInstallmentPurchaseUseCase {
  constructor(private readonly purchases: InstallmentPurchaseRepository) {}

  async execute(input: CreateInstallmentPurchaseInput): Promise<{ purchaseId: string }> {
    const totalAmountCents = moneyCents(input.totalAmountCents);
    const installments = createInstallmentSchedule(
      totalAmountCents,
      input.installmentsCount,
      input.firstDueOn
    );

    const purchaseId = await this.purchases.createWithInstallments({
      purchase: {
        farmId: input.farmId as never,
        userId: input.userId as never,
        cardId: input.cardId as never,
        description: input.description,
        category: input.category as never,
        totalAmountCents,
        installmentsCount: input.installmentsCount,
        firstDueOn: input.firstDueOn,
        cropPlanId: input.cropPlanId as never
      },
      installments
    });

    return { purchaseId };
  }
}

