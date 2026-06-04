import type {
  CropPlan,
  Farm,
  FinancialTransaction,
  PlannedBudgetItem,
  User
} from "../../../domain/entities.js";
import type { AgriculturalCategory, SubscriptionStatus } from "../../../domain/enums.js";
import { moneyCents } from "../../../shared/types.js";

export function mapUser(row: Record<string, unknown>): User {
  return {
    id: row.id as never,
    phone: String(row.phone),
    email: row.email ? String(row.email) : null,
    name: String(row.name),
    subscriptionStatus: row.subscription_status as SubscriptionStatus,
    createdAt: new Date(String(row.created_at)),
    deletedAt: row.deleted_at ? new Date(String(row.deleted_at)) : null
  };
}

export function mapFarm(row: Record<string, unknown>): Farm {
  return {
    id: row.id as never,
    ownerUserId: row.owner_user_id as never,
    name: String(row.name),
    city: String(row.city),
    state: String(row.state),
    mainActivity: String(row.main_activity),
    createdAt: new Date(String(row.created_at)),
    deletedAt: row.deleted_at ? new Date(String(row.deleted_at)) : null
  };
}

export function mapCropPlan(row: Record<string, unknown>): CropPlan {
  return {
    id: row.id as never,
    farmId: row.farm_id as never,
    name: String(row.name),
    crop: String(row.crop),
    season: String(row.season),
    startsOn: new Date(String(row.starts_on)),
    endsOn: new Date(String(row.ends_on)),
    status: row.status as never,
    createdAt: new Date(String(row.created_at)),
    deletedAt: row.deleted_at ? new Date(String(row.deleted_at)) : null
  };
}

export function mapBudgetItem(row: Record<string, unknown>): PlannedBudgetItem {
  return {
    id: row.id as never,
    cropPlanId: row.crop_plan_id as never,
    category: row.category_code as AgriculturalCategory,
    plannedAmountCents: moneyCents(Number(row.planned_amount_cents)),
    spentAmountCents: moneyCents(Number(row.spent_amount_cents))
  };
}

export function mapTransaction(row: Record<string, unknown>): FinancialTransaction {
  return {
    id: row.id as never,
    farmId: row.farm_id as never,
    userId: row.user_id as never,
    type: row.type as never,
    amountCents: moneyCents(Number(row.amount_cents)),
    description: String(row.description),
    category: row.category_code as AgriculturalCategory,
    occurredOn: new Date(String(row.occurred_on)),
    paymentMethod: row.payment_method as never,
    cropPlanId: row.crop_plan_id as never,
    cardId: row.card_id as never,
    installmentPurchaseId: row.installment_purchase_id as never,
    createdAt: new Date(String(row.created_at)),
    deletedAt: row.deleted_at ? new Date(String(row.deleted_at)) : null
  };
}

export function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

