import { describe, expect, it } from "vitest";
import { buildWelcomeMessage, normalizeBrazilianWhatsAppChatId } from "./welcome-routes.js";

describe("normalizeBrazilianWhatsAppChatId", () => {
  it("normaliza telefone brasileiro com mascara para chatId privado", () => {
    expect(normalizeBrazilianWhatsAppChatId("(44) 99999-9999")).toBe(
      "5544999999999@c.us"
    );
  });

  it("aceita telefone brasileiro com DDI", () => {
    expect(normalizeBrazilianWhatsAppChatId("+55 44 99999-9999")).toBe(
      "5544999999999@c.us"
    );
  });

  it("preserva chatId privado ja formatado", () => {
    expect(normalizeBrazilianWhatsAppChatId("5544999999999@c.us")).toBe(
      "5544999999999@c.us"
    );
  });

  it("rejeita telefone sem DDD valido", () => {
    expect(normalizeBrazilianWhatsAppChatId("99999-9999")).toBeNull();
  });
});

describe("buildWelcomeMessage", () => {
  it("orienta o novo pagante a iniciar conversa com o prefixo Redeas", () => {
    expect(buildWelcomeMessage()).toContain("Redeas gastei R$ 50 em diesel");
  });
});
