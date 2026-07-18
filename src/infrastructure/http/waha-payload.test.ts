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
      senderId: "554399509467@c.us",
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
      senderId: "554497033921@c.us",
      senderPhone: "554497033921",
      phone: "554497033921",
      isGroup: true,
      text: "redeas recebi 50 reais da plantacao"
    });
  });

  it("ignora mensagens fromMe por padrao", () => {
    const message = extractWahaMessage({
      payload: {
        id: "msg-3",
        chatId: "120363999999999999@g.us",
        fromMe: true,
        body: "redeas gastei 50 com combustivel"
      }
    });

    expect(message).toBeNull();
  });

  it("processa mensagens fromMe em grupo quando habilitado explicitamente", () => {
    const message = extractWahaMessage(
      {
        payload: {
          id: "msg-4",
          chatId: "120363999999999999@g.us",
          fromMe: true,
          body: "redeas gastei 50 com combustivel"
        }
      },
      {
        processGroupFromMe: true,
        ownPhone: "554498924520"
      }
    );

    expect(message).toMatchObject({
      providerMessageId: "msg-4",
      chatId: "120363999999999999@g.us",
      senderId: "554498924520",
      senderPhone: "554498924520",
      phone: "554498924520",
      isGroup: true
    });
  });

  it("recupera o grupo pelo id da mensagem quando o chat vem como lid", () => {
    const message = extractWahaMessage(
      {
        payload: {
          id: "false_120363423533383999@g.us_ABCDEF_11085394505852@lid",
          chatId: "11085394505852@lid",
          fromMe: true,
          body: "redeas gastei 50 com combustivel"
        }
      },
      {
        processGroupFromMe: true,
        ownPhone: "554498924520"
      }
    );

    expect(message).toMatchObject({
      chatId: "120363423533383999@g.us",
      senderId: "554498924520",
      senderPhone: "554498924520",
      isGroup: true,
      fromMe: true
    });
  });

  it("recupera grupo legado com hifen pelo id da mensagem", () => {
    const message = extractWahaMessage({
      payload: {
        id: "false_554499307273-1399939144@g.us_3ABE4449C8988953366C_85409719709700@lid",
        chatId: "85409719709700@lid",
        author: "85409719709700@lid",
        body: "redeas gastei 50 com combustivel"
      }
    });

    expect(message).toMatchObject({
      chatId: "554499307273-1399939144@g.us",
      senderId: "85409719709700@lid",
      senderPhone: "85409719709700",
      isGroup: true
    });
  });

  it("preserva o lid do remetente para resolucao posterior", () => {
    const message = extractWahaMessage({
      payload: {
        id: "false_120363422092127850@g.us_ABCDEF_175934812471538@lid",
        chatId: "120363422092127850@g.us",
        author: "175934812471538@lid",
        body: "redeas gastei 50 com combustivel"
      }
    });

    expect(message).toMatchObject({
      chatId: "120363422092127850@g.us",
      senderId: "175934812471538@lid",
      senderPhone: "175934812471538",
      isGroup: true
    });
  });
});
