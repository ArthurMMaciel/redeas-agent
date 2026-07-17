import { describe, expect, it } from "vitest";
import { extractRedeasCommand, resolveIdentityPhone, resolveReplyChatId } from "./webhook-routes.js";

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
  it("usa o telefone padrao configurado para grupos", async () => {
    expect(
      await resolveIdentityPhone({
        isGroup: true,
        senderId: "11085394505852@lid",
        senderPhone: "11085394505852",
        groupDefaultUserPhone: "55 44 98924-520"
      })
    ).toBe("554498924520");
  });

  it("usa o remetente para mensagens privadas", async () => {
    expect(
      await resolveIdentityPhone({
        isGroup: false,
        senderId: "5544998581299@c.us",
        senderPhone: "5544998581299",
        groupDefaultUserPhone: "554498924520"
      })
    ).toBe("5544998581299");
  });

  it("resolve lid para telefone antes de validar usuario", async () => {
    expect(
      await resolveIdentityPhone({
        isGroup: false,
        senderId: "175934812471538@lid",
        senderPhone: "175934812471538",
        resolveLidPhone: async (lid) =>
          lid === "175934812471538@lid" ? "554488684248" : null
      })
    ).toBe("554488684248");
  });

  it("usa o senderPhone se o lid nao resolver", async () => {
    expect(
      await resolveIdentityPhone({
        isGroup: false,
        senderId: "999@lid",
        senderPhone: "999",
        resolveLidPhone: async () => null
      })
    ).toBe("999");
  });
});

describe("resolveReplyChatId", () => {
  it("responde no grupo quando a mensagem veio de grupo", () => {
    expect(
      resolveReplyChatId({
        isGroup: true,
        chatId: "120363423533383999@g.us",
        identityPhone: "554498924520"
      })
    ).toBe("120363423533383999@g.us");
  });

  it("responde no chat privado recebido quando ele ja veio como c.us", () => {
    expect(
      resolveReplyChatId({
        isGroup: false,
        chatId: "554488684248@c.us",
        identityPhone: "554498924520"
      })
    ).toBe("554488684248@c.us");
  });

  it("responde no chat recebido quando a mensagem privada veio como lid", () => {
    expect(
      resolveReplyChatId({
        isGroup: false,
        chatId: "15595126939882@lid",
        identityPhone: "554498924520"
      })
    ).toBe("15595126939882@lid");
  });
});
