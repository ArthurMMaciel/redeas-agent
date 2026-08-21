import { describe, expect, it } from "vitest";
import { toPrivateChatId } from "./waha-client.js";

describe("toPrivateChatId", () => {
  it("converte telefone numerico em chatId privado do WAHA", () => {
    expect(toPrivateChatId("5544999999999")).toBe("5544999999999@c.us");
  });

  it("preserva ids de chat ja formatados", () => {
    expect(toPrivateChatId("120363423533383999@g.us")).toBe(
      "120363423533383999@g.us"
    );
  });
});
