import type {
  Card,
  CropPlan,
  Farm,
  FinancialTransaction,
  InstallmentPurchase,
  PlannedBudgetItem,
  User
} from "../../domain/entities.js";
import type {
  BudgetItemId,
  CropPlanId,
  FarmId,
  InstallmentPurchaseId,
  MoneyCents,
  TransactionId,
  UserId
} from "../../shared/types.js";
import type { AgriculturalCategory } from "../../domain/enums.js";

export interface UserRepository {
  findByPhone(phone: string): Promise<User | null>;
  findById(userId: UserId): Promise<User | null>;
  createFreeUser(input: {
    phone: string;
    name: string;
    email?: string | null;
  }): Promise<User>;
}

export interface FarmRepository {
  findDefaultByUserId(userId: UserId): Promise<Farm | null>;
  create(input: {
    ownerUserId: UserId;
    name: string;
    city: string;
    state: string;
    mainActivity: string;
  }): Promise<Farm>;
}

export interface UsageRepository {
  countTransactionsCreatedToday(userId: UserId, timeZone: string): Promise<number>;
}

export interface TransactionRepository {
  create(input: Omit<FinancialTransaction, "id" | "createdAt" | "deletedAt">): Promise<FinancialTransaction>;
  findById(transactionId: TransactionId): Promise<FinancialTransaction | null>;
}

export interface CropPlanRepository {
  create(input: Omit<CropPlan, "id" | "createdAt" | "deletedAt">): Promise<CropPlan>;
  findActiveBudgetItem(input: {
    farmId: FarmId;
    category: AgriculturalCategory;
    occurredOn: Date;
  }): Promise<PlannedBudgetItem | null>;
  incrementSpentAmount(input: {
    budgetItemId: BudgetItemId;
    amountCents: MoneyCents;
  }): Promise<PlannedBudgetItem>;
}

export interface CardRepository {
  findById(cardId: string): Promise<Card | null>;
}

export interface InstallmentPurchaseRepository {
  createWithInstallments(input: {
    purchase: Omit<InstallmentPurchase, "id" | "createdAt">;
    installments: Array<{ number: number; amountCents: MoneyCents; dueOn: Date }>;
  }): Promise<InstallmentPurchaseId>;
}

export interface ReportRepository {
  listUsersEligibleForDailyReport(): Promise<User[]>;
  saveDailyReport(input: { userId: UserId; content: string; sentAt: Date }): Promise<void>;
}

