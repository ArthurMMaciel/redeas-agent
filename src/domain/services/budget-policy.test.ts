import { describe, expect, it } from "vitest";
import { moneyCents } from "../../shared/types.js";
import { calculateBudgetStatus } from "./budget-policy.js";

describe("calculateBudgetStatus", () => {
  it("emits an eighty percent alert when spending reaches 80 percent", () => {
    const status = calculateBudgetStatus(moneyCents(100_00), moneyCents(80_00));

    expect(status.alertLevel).toBe("eighty");
    expect(status.consumedPercent).toBe(80);
    expect(status.remainingAmountCents).toBe(20_00);
  });

  it("emits over alert with exceeded amount", () => {
    const status = calculateBudgetStatus(moneyCents(100_00), moneyCents(125_00));

    expect(status.alertLevel).toBe("over");
    expect(status.exceededAmountCents).toBe(25_00);
    expect(status.remainingAmountCents).toBe(-25_00);
  });
});

