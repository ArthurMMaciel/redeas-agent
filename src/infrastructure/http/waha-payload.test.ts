import { describe, expect, it } from "vitest";
import { extractWahaMessage } from "./waha-payload.js";

describe("extractWahaMessage", () => {
  it("extrai mensagem privada usando o telefone como chat e identidade", () => {
    const message = extractWahaMessage({
      payload: {
        id: "msg-1",
        chatId: "554399509467@c.us",
        body: "redeas gastei R$ 50 em diesel",
        timestamp: 1_788_888_888
      }
    });

    expect(message).toMatchObject({
      providerMessageId: "msg-1",
      chatId: "554399509467@c.us",
      senderPhone: "554399509467",
      phone: "554399509467",
      isGroup: false,
      text: "redeas gastei R$ 50 em diesel"
    });
  });

  it("extrai mensagem de grupo usando o grupo como chat e participante como identidade", () => {
    const message = extractWahaMessage({
      payload: {
        id: "msg-2",
        chatId: "120363999999999999@g.us",
        sender: "554497033921@c.us",
        body: "redeas recebi 50 reais da plantacao",
        timestamp: "2026-07-10T12:00:00.000Z"
      }
    });

    expect(message).toMatchObject({
      providerMessageId: "msg-2",
      chatId: "120363999999999999@g.us",
      senderPhone: "554497033921",
      phone: "554497033921",
      isGroup: true,
      text: "redeas recebi 50 reais da plantacao"
    });
  });
});
