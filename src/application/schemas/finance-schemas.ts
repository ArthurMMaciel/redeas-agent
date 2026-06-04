import { z } from "zod";
import { agriculturalCategories } from "../../domain/enums.js";

export const createTransactionSchema = z.object({
  userId: z.string().uuid(),
  farmId: z.string().uuid(),
  type: z.enum(["income", "expense"]),
  amountCents: z.number().int().nonnegative(),
  description: z.string().min(2).max(240),
  category: z.enum(agriculturalCategories),
  occurredOn: z.coerce.date(),
  paymentMethod: z.enum(["pix", "cash", "boleto", "card", "transfer", "other"]).nullable().default(null),
  cardId: z.string().uuid().nullable().default(null)
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

export const createCropPlanSchema = z.object({
  farmId: z.string().uuid(),
  name: z.string().min(2).max(120),
  crop: z.string().min(2).max(80),
  season: z.string().min(2).max(80),
  startsOn: z.coerce.date(),
  endsOn: z.coerce.date()
});

export type CreateCropPlanInput = z.infer<typeof createCropPlanSchema>;

