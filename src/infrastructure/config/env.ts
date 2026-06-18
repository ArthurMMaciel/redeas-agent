import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.string().default("info"),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4.1-mini"),
  WAHA_BASE_URL: z.string().url().default("http://localhost:3001"),
  WAHA_API_KEY: z.string().optional(),
  WAHA_SESSION: z.string().default("default"),
  WAHA_DRY_RUN: z.coerce.boolean().default(false),
  PAYMENT_PROVIDER: z.string().default("pagarme"),
  PAGARME_API_KEY: z.string().optional(),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  AGENT_API_KEY: z.string().optional()
});

export const env = envSchema.parse(process.env);
