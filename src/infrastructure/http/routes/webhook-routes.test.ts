import { describe, expect, it } from "vitest";
import { extractRedeasCommand, resolveIdentityPhone } from "./webhook-routes.js";

describe("extractRedeasCommand", () => {
  it("extrai o comando quando a mensagem comeca com redeas", () => {
    expect(extractRedeasCommand("redeas recebi 50 reais da plantacao")).toBe(
      "recebi 50 reais da plantacao"
    );
    expect(extractRedeasCommand("Redeas: gastei R$ 50 em diesel")).toBe(
      "gastei R$ 50 em diesel"
    );
  });

  it("ignora mensagens sem o prefixo redeas", () => {
    expect(extractRedeasCommand("gastei R$ 50 em diesel")).toBeNull();
    expect(extractRedeasCommand("oi redeas gastei R$ 50")).toBeNull();
    expect(extractRedeasCommand("redeas")).toBeNull();
  });
});

describe("resolveIdentityPhone", () => {
  it("usa o telefone padrao configurado para grupos", () => {
    expect(
      resolveIdentityPhone({
        isGroup: true,
        senderPhone: "11085394505852",
        groupDefaultUserPhone: "55 44 98924-520"
      })
    ).toBe("554498924520");
  });

  it("usa o remetente para mensagens privadas", () => {
    expect(
      resolveIdentityPhone({
        isGroup: false,
        senderPhone: "5544998581299",
        groupDefaultUserPhone: "554498924520"
      })
    ).toBe("5544998581299");
  });
});
