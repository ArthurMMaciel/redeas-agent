import type { CropPlanRepository } from "../ports/repositories.js";
import { createCropPlanSchema, type CreateCropPlanInput } from "../schemas/finance-schemas.js";

export class CreateCropPlanUseCase {
  constructor(private readonly cropPlans: CropPlanRepository) {}

  async execute(rawInput: CreateCropPlanInput): Promise<{ cropPlanId: string }> {
    const input = createCropPlanSchema.parse(rawInput);

    if (input.endsOn <= input.startsOn) {
      throw new Error("Crop plan end date must be after start date");
    }

    const cropPlan = await this.cropPlans.create({
      farmId: input.farmId as never,
      name: input.name,
      crop: input.crop,
      season: input.season,
      startsOn: input.startsOn,
      endsOn: input.endsOn,
      status: "active"
    });

    return { cropPlanId: cropPlan.id };
  }
}

