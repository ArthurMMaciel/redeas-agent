import { assertCanCreateTransaction } from "../../domain/services/usage-policy.js";
import { calculateBudgetStatus } from "../../domain/services/budget-policy.js";
import { BRAZIL_TIME_ZONE, moneyCents } from "../../shared/types.js";
import type { Clock } from "../ports/clock.js";
import type {
  CropPlanRepository,
  TransactionRepository,
  UsageRepository,
  UserRepository
} from "../ports/repositories.js";
import { createTransactionSchema, type CreateTransactionInput } from "../schemas/finance-schemas.js";

export interface CreateTransactionResult {
  transactionId: string;
  budgetStatus: ReturnType<typeof calculateBudgetStatus> | null;
}

export class CreateTransactionUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly usage: UsageRepository,
    private readonly transactions: TransactionRepository,
    private readonly cropPlans: CropPlanRepository,
    private readonly clock: Clock
  ) {}

  async execute(rawInput: CreateTransactionInput): Promise<CreateTransactionResult> {
    const input = createTransactionSchema.parse(rawInput);
    const user = await this.users.findById(input.userId as never);
    if (!user) {
      throw new Error("User not found");
    }

    const transactionsCreatedToday = await this.usage.countTransactionsCreatedToday(user.id, BRAZIL_TIME_ZONE);
    assertCanCreateTransaction({
      subscriptionStatus: user.subscriptionStatus,
      transactionsCreatedToday
    });

    const budgetItem =
      input.type === "expense"
        ? await this.cropPlans.findActiveBudgetItem({
            farmId: input.farmId as never,
            category: input.category,
            occurredOn: input.occurredOn
          })
        : null;

    const transaction = await this.transactions.create({
      farmId: input.farmId as never,
      userId: user.id,
      type: input.type,
      amountCents: moneyCents(input.amountCents),
      description: input.description,
      category: input.category,
      occurredOn: input.occurredOn,
      paymentMethod: input.paymentMethod,
      cropPlanId: budgetItem?.cropPlanId ?? null,
      cardId: input.cardId as never,
      installmentPurchaseId: null
    });

    if (!budgetItem || input.type !== "expense") {
      return { transactionId: transaction.id, budgetStatus: null };
    }

    const updatedBudget = await this.cropPlans.incrementSpentAmount({
      budgetItemId: budgetItem.id,
      amountCents: transaction.amountCents
    });

    return {
      transactionId: transaction.id,
      budgetStatus: calculateBudgetStatus(updatedBudget.plannedAmountCents, updatedBudget.spentAmountCents)
    };
  }
}

