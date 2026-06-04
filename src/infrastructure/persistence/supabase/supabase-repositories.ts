import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CropPlanRepository,
  FarmRepository,
  TransactionRepository,
  UsageRepository,
  UserRepository
} from "../../../application/ports/repositories.js";
import type { CropPlan, FinancialTransaction } from "../../../domain/entities.js";
import type { AgriculturalCategory } from "../../../domain/enums.js";
import type { BudgetItemId, FarmId, MoneyCents, TransactionId, UserId } from "../../../shared/types.js";
import { mapBudgetItem, mapCropPlan, mapFarm, mapTransaction, mapUser, toDateOnly } from "./mappers.js";

export class SupabaseUserRepository implements UserRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findByPhone(phone: string) {
    const { data, error } = await this.supabase
      .from("users")
      .select("*")
      .eq("phone", phone)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw error;
    return data ? mapUser(data) : null;
  }

  async findById(userId: UserId) {
    const { data, error } = await this.supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw error;
    return data ? mapUser(data) : null;
  }

  async createFreeUser(input: { phone: string; name: string; email?: string | null }) {
    const insert: Record<string, unknown> = {
      phone: input.phone,
      name: input.name,
      subscription_status: "free"
    };

    if (input.email) {
      insert.email = input.email;
    }

    const { data, error } = await this.supabase.from("users").insert(insert).select("*").single();
    if (error) throw error;
    return mapUser(data);
  }
}

export class SupabaseFarmRepository implements FarmRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findDefaultByUserId(userId: UserId) {
    const { data, error } = await this.supabase
      .from("user_farms")
      .select("farms(*)")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    const farm = data?.farms;
    return farm ? mapFarm(Array.isArray(farm) ? farm[0] : farm) : null;
  }

  async create(input: {
    ownerUserId: UserId;
    name: string;
    city: string;
    state: string;
    mainActivity: string;
  }) {
    const { data: farm, error: farmError } = await this.supabase
      .from("farms")
      .insert({
        owner_user_id: input.ownerUserId,
        name: input.name,
        city: input.city,
        state: input.state,
        main_activity: input.mainActivity
      })
      .select("*")
      .single();

    if (farmError) throw farmError;

    const { error: relationError } = await this.supabase.from("user_farms").insert({
      user_id: input.ownerUserId,
      farm_id: farm.id,
      role: "owner"
    });

    if (relationError) throw relationError;
    return mapFarm(farm);
  }
}

export class SupabaseUsageRepository implements UsageRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async countTransactionsCreatedToday(userId: UserId, _timeZone: string): Promise<number> {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);

    const { count, error } = await this.supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", start.toISOString())
      .is("deleted_at", null);

    if (error) throw error;
    return count ?? 0;
  }
}

export class SupabaseTransactionRepository implements TransactionRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async create(input: Omit<FinancialTransaction, "id" | "createdAt" | "deletedAt">) {
    const { data, error } = await this.supabase
      .from("transactions")
      .insert({
        farm_id: input.farmId,
        user_id: input.userId,
        crop_plan_id: input.cropPlanId,
        card_id: input.cardId,
        installment_purchase_id: input.installmentPurchaseId,
        type: input.type,
        amount_cents: input.amountCents,
        description: input.description,
        category_code: input.category,
        occurred_on: toDateOnly(input.occurredOn),
        payment_method: input.paymentMethod
      })
      .select("*")
      .single();

    if (error) throw error;
    return mapTransaction(data);
  }

  async findById(transactionId: TransactionId) {
    const { data, error } = await this.supabase
      .from("transactions")
      .select("*")
      .eq("id", transactionId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw error;
    return data ? mapTransaction(data) : null;
  }
}

export class SupabaseCropPlanRepository implements CropPlanRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async create(input: Omit<CropPlan, "id" | "createdAt" | "deletedAt">) {
    const { data, error } = await this.supabase
      .from("crop_plans")
      .insert({
        farm_id: input.farmId,
        name: input.name,
        crop: input.crop,
        season: input.season,
        starts_on: toDateOnly(input.startsOn),
        ends_on: toDateOnly(input.endsOn),
        status: input.status
      })
      .select("*")
      .single();

    if (error) throw error;
    return mapCropPlan(data);
  }

  async findActiveBudgetItem(input: {
    farmId: FarmId;
    category: AgriculturalCategory;
    occurredOn: Date;
  }) {
    const occurredOn = toDateOnly(input.occurredOn);
    const { data, error } = await this.supabase
      .from("planned_budget_items")
      .select("*, crop_plans!inner(farm_id, status, starts_on, ends_on)")
      .eq("category_code", input.category)
      .eq("crop_plans.farm_id", input.farmId)
      .eq("crop_plans.status", "active")
      .lte("crop_plans.starts_on", occurredOn)
      .gte("crop_plans.ends_on", occurredOn)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data ? mapBudgetItem(data) : null;
  }

  async incrementSpentAmount(input: { budgetItemId: BudgetItemId; amountCents: MoneyCents }) {
    const { data: current, error: readError } = await this.supabase
      .from("planned_budget_items")
      .select("*")
      .eq("id", input.budgetItemId)
      .single();

    if (readError) throw readError;

    const nextAmount = Number(current.spent_amount_cents) + Number(input.amountCents);
    const { data, error } = await this.supabase
      .from("planned_budget_items")
      .update({ spent_amount_cents: nextAmount, updated_at: new Date().toISOString() })
      .eq("id", input.budgetItemId)
      .select("*")
      .single();

    if (error) throw error;
    return mapBudgetItem(data);
  }
}

export class SupabaseProcessedMessageRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async wasProcessed(providerMessageId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("processed_messages")
      .select("provider_message_id")
      .eq("provider_message_id", providerMessageId)
      .maybeSingle();

    if (isMissingTableError(error)) return false;
    if (error) throw error;
    return Boolean(data);
  }

  async markProcessed(providerMessageId: string): Promise<void> {
    const { error } = await this.supabase
      .from("processed_messages")
      .upsert({ provider_message_id: providerMessageId, provider: "waha" });

    if (isMissingTableError(error)) return;
    if (error) throw error;
  }
}

function isMissingTableError(error: { code?: string } | null): boolean {
  return error?.code === "PGRST205";
}
