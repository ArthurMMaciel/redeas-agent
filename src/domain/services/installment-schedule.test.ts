import { describe, expect, it } from "vitest";
import { moneyCents } from "../../shared/types.js";
import { createInstallmentSchedule } from "./installment-schedule.js";

describe("createInstallmentSchedule", () => {
  it("splits cents without losing remainder", () => {
    const schedule = createInstallmentSchedule(moneyCents(10_00), 3, new Date("2026-07-10T00:00:00.000Z"));

    expect(schedule.map((item) => item.amountCents)).toEqual([334, 333, 333]);
    expect(schedule.reduce((sum, item) => sum + item.amountCents, 0)).toBe(10_00);
    expect(schedule.map((item) => item.number)).toEqual([1, 2, 3]);
  });
});

