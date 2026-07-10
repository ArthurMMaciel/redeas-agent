import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CheckoutIntentRepository,
  CropPlanRepository,
  FarmRepository,
  PlanRepository,
  SubscriptionRepository,
  TransactionRepository,
  UsageRepository,
  UserRepository
} from "../../../application/ports/repositories.js";
import type { ProcessedMessageRepository } from "../../../application/ports/messaging.js";
import type { CropPlan, FinancialTransaction, Plan } from "../../../domain/entities.js";
import type { AgriculturalCategory } from "../../../domain/enums.js";
import type { BudgetItemId, CheckoutIntentId, FarmId, MoneyCents, PlanId, TransactionId, UserId } from "../../../shared/types.js";
import { mapBudgetItem, mapCheckoutIntent, mapCropPlan, mapFarm, mapPlan, mapTransaction, mapUser, toDateOnly } from "./mappers.js";

export class SupabaseUserRepository implements UserRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findByPhone(phone: string) {
    const candidates = phoneCandidates(phone);
    const { data, error } = await this.supabase
      .from("users")
      .select("*")
      .in("phone", candidates)
      .is("deleted_at", null)
      .limit(candidates.length);

    if (error) throw error;
    const rows = Array.isArray(data) ? data : [];
    const selected = candidates
      .map((candidate) => rows.find((row) => row.phone === candidate))
      .find(Boolean);
    return selected ? mapUser(selected) : null;
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

  async upsertPaidUser(input: { phone: string; name: string; email?: string | null }) {
    const existing = await this.findByPhone(input.phone);
    if (existing) {
      const update: Record<string, unknown> = {
        name: input.name,
        subscription_status: "active",
        updated_at: new Date().toISOString()
      };

      if (input.email) {
        update.email = input.email;
      }

      const { data, error } = await this.supabase
        .from("users")
        .update(update)
        .eq("id", existing.id)
        .select("*")
        .single();

      if (error) throw error;
      return mapUser(data);
    }

    const insert: Record<string, unknown> = {
      phone: input.phone,
      name: input.name,
      subscription_status: "active"
    };

    if (input.email) {
      insert.email = input.email;
    }

    const { data, error } = await this.supabase.from("users").insert(insert).select("*").single();
    if (error) throw error;
    return mapUser(data);
  }
}

export class SupabasePlanRepository implements PlanRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findByCode(code: string) {
    const { data, error } = await this.supabase
      .from("plans")
      .select("*")
      .eq("code", code)
      .maybeSingle();

    if (error) throw error;
    return data ? mapPlan(data) : null;
  }

  async findById(planId: PlanId) {
    const { data, error } = await this.supabase
      .from("plans")
      .select("*")
      .eq("id", planId)
      .maybeSingle();

    if (error) throw error;
    return data ? mapPlan(data) : null;
  }
}

export class SupabaseSubscriptionRepository implements SubscriptionRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async createOrReplaceActive(input: {
    userId: UserId;
    planId: PlanId;
    gateway: string;
    gatewayCustomerId?: string | null;
    gatewaySubscriptionId?: string | null;
    currentPeriodStartsAt?: Date | null;
    currentPeriodEndsAt?: Date | null;
  }): Promise<void> {
    const { error: cancelError } = await this.supabase
      .from("subscriptions")
      .update({ status: "canceled", updated_at: new Date().toISOString() })
      .eq("user_id", input.userId)
      .eq("status", "active");

    if (cancelError) throw cancelError;

    const { error } = await this.supabase.from("subscriptions").insert({
      user_id: input.userId,
      plan_id: input.planId,
      status: "active",
      gateway: input.gateway,
      gateway_customer_id: input.gatewayCustomerId ?? null,
      gateway_subscription_id: input.gatewaySubscriptionId ?? null,
      current_period_starts_at: input.currentPeriodStartsAt?.toISOString() ?? null,
      current_period_ends_at: input.currentPeriodEndsAt?.toISOString() ?? null
    });

    if (error) throw error;
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

export class SupabaseCheckoutIntentRepository implements CheckoutIntentRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async create(input: {
    plan: Plan;
    name: string;
    phone: string;
    email?: string | null;
    farmName: string;
    city: string;
    state: string;
    mainActivity: string;
    gateway: string;
  }) {
    const { data, error } = await this.supabase
      .from("checkout_intents")
      .insert({
        plan_id: input.plan.id,
        plan_code: input.plan.code,
        name: input.name,
        phone: input.phone,
        email: input.email ?? null,
        farm_name: input.farmName,
        city: input.city,
        state: input.state,
        main_activity: input.mainActivity,
        gateway: input.gateway
      })
      .select("*")
      .single();

    if (error) throw error;
    return mapCheckoutIntent(data);
  }

  async attachGatewayCheckout(input: {
    checkoutIntentId: CheckoutIntentId;
    gatewayCheckoutId: string;
    checkoutUrl: string;
  }) {
    const { data, error } = await this.supabase
      .from("checkout_intents")
      .update({
        gateway_checkout_id: input.gatewayCheckoutId,
        checkout_url: input.checkoutUrl,
        updated_at: new Date().toISOString()
      })
      .eq("id", input.checkoutIntentId)
      .select("*")
      .single();

    if (error) throw error;
    return mapCheckoutIntent(data);
  }

  async findByGatewayCheckoutId(input: { gateway: string; gatewayCheckoutId: string }) {
    const { data, error } = await this.supabase
      .from("checkout_intents")
      .select("*")
      .eq("gateway", input.gateway)
      .eq("gateway_checkout_id", input.gatewayCheckoutId)
      .maybeSingle();

    if (error) throw error;
    return data ? mapCheckoutIntent(data) : null;
  }

  async markPaid(input: {
    checkoutIntentId: CheckoutIntentId;
    gatewayPaymentId?: string | null;
    rawGatewayPayload: unknown;
  }) {
    const { data, error } = await this.supabase
      .from("checkout_intents")
      .update({
        status: "paid",
        gateway_payment_id: input.gatewayPaymentId ?? null,
        raw_gateway_payload: input.rawGatewayPayload,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", input.checkoutIntentId)
      .select("*")
      .single();

    if (error) throw error;
    return mapCheckoutIntent(data);
  }

  async attachProvisionedResources(input: {
    checkoutIntentId: CheckoutIntentId;
    userId: UserId;
    farmId: FarmId;
  }): Promise<void> {
    const { error } = await this.supabase
      .from("checkout_intents")
      .update({
        created_user_id: input.userId,
        created_farm_id: input.farmId,
        updated_at: new Date().toISOString()
      })
      .eq("id", input.checkoutIntentId);

    if (error) throw error;
  }

  async savePaymentEvent(input: {
    gateway: string;
    externalId?: string | null;
    eventType: string;
    payload: unknown;
  }): Promise<void> {
    const { error } = await this.supabase.from("payment_events").insert({
      gateway: input.gateway,
      external_id: input.externalId ?? null,
      event_type: input.eventType,
      payload: input.payload
    });

    if (error) throw error;
  }
}

export class SupabaseProcessedMessageRepository implements ProcessedMessageRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async wasProcessed(messageId: string, channel: string): Promise<boolean> {
    const storageId = processedMessageStorageId(messageId, channel);
    const { data, error } = await this.supabase
      .from("processed_messages")
      .select("provider_message_id")
      .eq("provider_message_id", storageId)
      .maybeSingle();

    if (isMissingTableError(error)) return false;
    if (error) throw error;
    return Boolean(data);
  }

  async markProcessed(messageId: string, channel: string): Promise<void> {
    const storageId = processedMessageStorageId(messageId, channel);
    const { error } = await this.supabase
      .from("processed_messages")
      .upsert({ provider_message_id: storageId, provider: channel });

    if (isMissingTableError(error)) return;
    if (error) throw error;
  }
}

function isMissingTableError(error: { code?: string } | null): boolean {
  return error?.code === "PGRST205";
}

function processedMessageStorageId(messageId: string, channel: string): string {
  return `${channel}:${messageId}`;
}

function phoneCandidates(phone: string): string[] {
  const normalized = phone.replace(/\D/g, "");
  const candidates = [normalized];
  const withoutBrazilMobileNine = normalized.match(/^55(\d{2})(\d{8})$/);
  if (withoutBrazilMobileNine) {
    candidates.push(`55${withoutBrazilMobileNine[1]}9${withoutBrazilMobileNine[2]}`);
  }

  const withBrazilMobileNine = normalized.match(/^55(\d{2})9(\d{8})$/);
  if (withBrazilMobileNine) {
    candidates.push(`55${withBrazilMobileNine[1]}${withBrazilMobileNine[2]}`);
  }

  return Array.from(new Set(candidates));
}
