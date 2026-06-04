export const agriculturalCategories = [
  "seeds",
  "fertilizers",
  "defensives",
  "fuel",
  "machinery",
  "maintenance",
  "labor",
  "freight",
  "lease",
  "irrigation",
  "energy",
  "insurance",
  "outsourced_services",
  "food",
  "other"
] as const;

export type AgriculturalCategory = (typeof agriculturalCategories)[number];

export type TransactionType = "income" | "expense";
export type PaymentMethod = "pix" | "cash" | "boleto" | "card" | "transfer" | "other";
export type CropPlanStatus = "active" | "paused" | "closed";
export type SubscriptionStatus = "free" | "trialing" | "active" | "past_due" | "canceled";
export type UserRole = "owner" | "farm_admin" | "operator" | "viewer" | "internal_admin";
export type AuditAction = "create" | "update" | "delete";

