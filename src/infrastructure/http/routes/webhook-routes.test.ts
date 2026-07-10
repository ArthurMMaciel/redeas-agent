import { describe, expect, it } from "vitest";
import { extractRedeasCommand } from "./webhook-routes.js";

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
