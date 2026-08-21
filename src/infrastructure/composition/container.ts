import { CreateTransactionUseCase } from "../../application/use-cases/create-transaction.js";
import { CreateCheckoutUseCase } from "../../application/use-cases/create-checkout.js";
import { ProcessPaymentWebhookUseCase } from "../../application/use-cases/process-payment-webhook.js";
import { MessageProcessorService } from "../../application/services/message-processor-service.js";
import { SystemClock } from "../../application/ports/clock.js";
import { createSupabaseClient } from "../persistence/supabase/client.js";
import {
  SupabaseCheckoutIntentRepository,
  SupabaseCropPlanRepository,
  SupabaseFarmRepository,
  SupabasePlanRepository,
  SupabaseProcessedMessageRepository,
  SupabaseSubscriptionRepository,
  SupabaseTransactionRepository,
  SupabaseUsageRepository,
  SupabaseUserRepository
} from "../persistence/supabase/supabase-repositories.js";
import { WahaClient } from "../waha/waha-client.js";
import { PagarmeGateway } from "../payments/pagarme-gateway.js";
import { env } from "../config/env.js";
import { OpenAiAgentClient } from "../openai/openai-agent-client.js";
import { PersonalFinanceService } from "../personal-finance/personal-finance-service.js";

export function buildContainer() {
  const supabase = createSupabaseClient();
  const users = new SupabaseUserRepository(supabase);
  const farms = new SupabaseFarmRepository(supabase);
  const usage = new SupabaseUsageRepository(supabase);
  const plans = new SupabasePlanRepository(supabase);
  const subscriptions = new SupabaseSubscriptionRepository(supabase);
  const checkoutIntents = new SupabaseCheckoutIntentRepository(supabase);
  const transactions = new SupabaseTransactionRepository(supabase);
  const cropPlans = new SupabaseCropPlanRepository(supabase);
  const processedMessages = new SupabaseProcessedMessageRepository(supabase);
  const whatsApp = new WahaClient();
  const payments = new PagarmeGateway();
  const clock = new SystemClock();
  const personalFinance = new PersonalFinanceService();
  const agentAi = env.OPENAI_API_KEY
    ? new OpenAiAgentClient(env.OPENAI_API_KEY, env.OPENAI_MODEL)
    : undefined;
  const createTransaction = new CreateTransactionUseCase(users, usage, transactions, cropPlans, clock);
  const createCheckout = new CreateCheckoutUseCase(plans, checkoutIntents, payments, env.APP_BASE_URL);
  const processPaymentWebhook = new ProcessPaymentWebhookUseCase(
    checkoutIntents,
    plans,
    users,
    farms,
    subscriptions,
    whatsApp
  );

  return {
    messageProcessor: new MessageProcessorService(
      users,
      farms,
      processedMessages,
      createTransaction,
      subscriptions,
      agentAi
    ),
    createCheckout,
    processPaymentWebhook,
    personalFinance,
    whatsApp
  };
}
