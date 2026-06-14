import { describe, expect, it } from "vitest";
import { formatAgriculturalCategory, formatMoneyBRL, formatPercentBR } from "./formatters.js";

describe("formatters", () => {
  it("formats monetary values in Brazilian Portuguese", () => {
    expect(formatMoneyBRL(350_000)).toBe("R$ 3.500,00");
    expect(formatMoneyBRL(12_345_678)).toBe("R$ 123.456,78");
  });

  it("formats percentages with at most two decimal places", () => {
    expect(formatPercentBR(82.5)).toBe("82,5%");
    expect(formatPercentBR(82.567)).toBe("82,57%");
  });

  it("formats agricultural categories in Brazilian Portuguese", () => {
    expect(formatAgriculturalCategory("maintenance")).toBe("manutenção");
    expect(formatAgriculturalCategory("fuel")).toBe("combustível");
  });
});
