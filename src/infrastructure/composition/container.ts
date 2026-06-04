import { RegisterWhatsAppMessageUseCase } from "../../application/use-cases/register-whatsapp-message.js";
import { CreateTransactionUseCase } from "../../application/use-cases/create-transaction.js";
import { SystemClock } from "../../application/ports/clock.js";
import { createSupabaseClient } from "../persistence/supabase/client.js";
import {
  SupabaseCropPlanRepository,
  SupabaseFarmRepository,
  SupabaseProcessedMessageRepository,
  SupabaseTransactionRepository,
  SupabaseUsageRepository,
  SupabaseUserRepository
} from "../persistence/supabase/supabase-repositories.js";
import { WahaClient } from "../waha/waha-client.js";

export function buildContainer() {
  const supabase = createSupabaseClient();
  const users = new SupabaseUserRepository(supabase);
  const farms = new SupabaseFarmRepository(supabase);
  const usage = new SupabaseUsageRepository(supabase);
  const transactions = new SupabaseTransactionRepository(supabase);
  const cropPlans = new SupabaseCropPlanRepository(supabase);
  const processedMessages = new SupabaseProcessedMessageRepository(supabase);
  const whatsApp = new WahaClient(processedMessages);
  const clock = new SystemClock();
  const createTransaction = new CreateTransactionUseCase(users, usage, transactions, cropPlans, clock);

  return {
    registerWhatsAppMessage: new RegisterWhatsAppMessageUseCase(users, farms, whatsApp, createTransaction)
  };
}

