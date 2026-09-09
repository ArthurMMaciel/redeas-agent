import { describe, expect, it } from "vitest";
import {
  PersonalFinanceService,
  normalizeBrazilianPhone,
  parseFinanceCommand,
  parseMoney
} from "./personal-finance-service.js";
import { env } from "../config/env.js";

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

  it("interpreta o formato multiline sem IA", () => {
    const command = parseFinanceCommand(
      "fin-darithur\nMercado\n85.90\narroz e carne\n22/08/2026",
      new Date("2026-08-21T12:00:00-03:00")
    );

    expect(command).toMatchObject({
      category: "Mercado",
      amount: 85.9,
      description: "arroz e carne"
    });
    expect(command?.date.toISOString().slice(0, 10)).toBe("2026-08-22");
  });

  it("aceita acentos nas categorias do WhatsApp", () => {
    expect(parseFinanceCommand("fin-darithur\nCondomínio\n10\nmensal")?.category).toBe("Condominio");
    expect(parseFinanceCommand("fin-darithur\nCartão\n10\ncompra")?.category).toBe("Cartao");
    expect(parseFinanceCommand("fin-darithur\nSaúde\n10\nremédio")?.category).toBe("Saude");
  });
  it("aceita categorias de impostos e seguro", () => {
    expect(parseFinanceCommand("fin-darithur\nIPVA\n100\nparcela")?.category).toBe("IPVA");
    expect(parseFinanceCommand("fin-darithur\nIPTU\n80\ncasa")?.category).toBe("IPTU");
    expect(parseFinanceCommand("fin-darithur\nSeguro\n250\ncarro")?.category).toBe("Seguro");
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

describe("PersonalFinanceService.canHandle", () => {
  it("aceita remetente permitido por lid quando telefone real nao foi resolvido", () => {
    const originalAllowedPhones = env.PERSONAL_FINANCE_ALLOWED_PHONES;
    const originalAllowedLids = env.PERSONAL_FINANCE_ALLOWED_LIDS;
    env.PERSONAL_FINANCE_ALLOWED_PHONES = "5544998581299";
    env.PERSONAL_FINANCE_ALLOWED_LIDS = "11085394505852@lid";

    try {
      const service = new PersonalFinanceService();
      expect(
        service.canHandle({
          phone: "11085394505852",
          senderId: "11085394505852@lid",
          text: "fin-darithur\nMercado\n10\nBacon"
        })
      ).toBe(true);
    } finally {
      env.PERSONAL_FINANCE_ALLOWED_PHONES = originalAllowedPhones;
      env.PERSONAL_FINANCE_ALLOWED_LIDS = originalAllowedLids;
    }
  });
});
