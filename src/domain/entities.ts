import type {
  AgriculturalCategory,
  CropPlanStatus,
  PaymentMethod,
  SubscriptionStatus,
  TransactionType,
  UserRole
} from "./enums.js";
import type {
  BudgetItemId,
  CardId,
  CropPlanId,
  FarmId,
  InstallmentPurchaseId,
  MoneyCents,
  TransactionId,
  UserId
} from "../shared/types.js";

export interface User {
  id: UserId;
  phone: string;
  email: string | null;
  name: string;
  subscriptionStatus: SubscriptionStatus;
  createdAt: Date;
  deletedAt: Date | null;
}

export interface Farm {
  id: FarmId;
  name: string;
  city: string;
  state: string;
  mainActivity: string;
  ownerUserId: UserId;
  createdAt: Date;
  deletedAt: Date | null;
}

export interface UserFarm {
  userId: UserId;
  farmId: FarmId;
  role: UserRole;
}

export interface CropPlan {
  id: CropPlanId;
  farmId: FarmId;
  name: string;
  crop: string;
  season: string;
  startsOn: Date;
  endsOn: Date;
  status: CropPlanStatus;
  createdAt: Date;
  deletedAt: Date | null;
}

export interface PlannedBudgetItem {
  id: BudgetItemId;
  cropPlanId: CropPlanId;
  category: AgriculturalCategory;
  plannedAmountCents: MoneyCents;
  spentAmountCents: MoneyCents;
}

export interface FinancialTransaction {
  id: TransactionId;
  farmId: FarmId;
  userId: UserId;
  type: TransactionType;
  amountCents: MoneyCents;
  description: string;
  category: AgriculturalCategory;
  occurredOn: Date;
  paymentMethod: PaymentMethod | null;
  cropPlanId: CropPlanId | null;
  cardId: CardId | null;
  installmentPurchaseId: InstallmentPurchaseId | null;
  createdAt: Date;
  deletedAt: Date | null;
}

export interface Card {
  id: CardId;
  farmId: FarmId;
  name: string;
  closingDay: number;
  dueDay: number;
  lastFourDigits: string | null;
  createdAt: Date;
  deletedAt: Date | null;
}

export interface InstallmentPurchase {
  id: InstallmentPurchaseId;
  farmId: FarmId;
  userId: UserId;
  cardId: CardId;
  description: string;
  category: AgriculturalCategory;
  totalAmountCents: MoneyCents;
  installmentsCount: number;
  firstDueOn: Date;
  cropPlanId: CropPlanId | null;
  createdAt: Date;
}

