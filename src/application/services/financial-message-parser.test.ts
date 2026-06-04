import { describe, expect, it } from "vitest";
import { parseQuickSignup, parseTransactionMessage } from "./financial-message-parser.js";

describe("parseTransactionMessage", () => {
  it("parses expense messages in Portuguese", () => {
    const parsed = parseTransactionMessage("Gastei 500 reais para manutenção da colheitadeira.");

    expect(parsed).toMatchObject({
      type: "expense",
      amountCents: 50_000,
      category: "machinery"
    });
  });

  it("parses income messages with mil suffix", () => {
    const parsed = parseTransactionMessage("Recebi 12 mil da venda de milho.");

    expect(parsed).toMatchObject({
      type: "income",
      amountCents: 1_200_000,
      category: "seeds"
    });
  });
});

describe("parseQuickSignup", () => {
  it("parses structured signup command", () => {
    expect(parseQuickSignup("cadastro João Silva | Fazenda Santa Maria | Cascavel/PR | soja")).toEqual({
      name: "João Silva",
      farmName: "Fazenda Santa Maria",
      city: "Cascavel",
      state: "PR",
      mainActivity: "soja"
    });
  });
});

