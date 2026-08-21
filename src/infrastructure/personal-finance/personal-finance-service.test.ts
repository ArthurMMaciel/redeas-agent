import { describe, expect, it } from "vitest";
import {
  normalizeBrazilianPhone,
  parseFinanceCommand,
  parseMoney
} from "./personal-finance-service.js";

describe("parseFinanceCommand", () => {
  it("interpreta categoria, valor e descricao", () => {
    const command = parseFinanceCommand(
      "fin mercado 85,90 arroz e carne",
      new Date("2026-08-21T12:00:00-03:00")
    );

    expect(command).toMatchObject({
      category: "Mercado",
      amount: 85.9,
      description: "arroz e carne"
    });
  });

  it("aceita categorias com duas palavras", () => {
    const command = parseFinanceCommand(
      "fin banho sukita 70 banho do mes",
      new Date("2026-08-21T12:00:00-03:00")
    );

    expect(command?.category).toBe("Banho Sukita");
  });

  it("interpreta data de ontem", () => {
    const command = parseFinanceCommand(
      "fin lazer 45 cinema ontem",
      new Date("2026-08-21T12:00:00-03:00")
    );

    expect(command?.date.toISOString().slice(0, 10)).toBe("2026-08-20");
  });
});

describe("parseMoney", () => {
  it("interpreta valores em formato brasileiro", () => {
    expect(parseMoney("1.234,56")).toBe(1234.56);
    expect(parseMoney("85,90")).toBe(85.9);
    expect(parseMoney("120")).toBe(120);
  });
});

describe("normalizeBrazilianPhone", () => {
  it("adiciona DDI quando recebe DDD e numero", () => {
    expect(normalizeBrazilianPhone("44998924520")).toBe("5544998924520");
  });
});
