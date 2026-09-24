import { describe, expect, it } from "vitest";
import {
  PersonalFinanceService,
  formatDailySummaryMessage,
  formatShoppingList,
  formatTaskList,
  normalizeBrazilianPhone,
  parseFinanceCommand,
  parseMoney,
  parsePersonalCommand,
  removeShoppingListItems
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

  it("aceita novas categorias da planilha mensal", () => {
    expect(parseFinanceCommand("fin-darithur\nMuay-thai\n90\nmensalidade")?.category).toBe("Muay-thai");
    expect(parseFinanceCommand("fin-darithur\nUso Mesada Arthur\n35\nlanche")?.category).toBe("Uso Mesada Arthur");
    expect(parseFinanceCommand("fin-darithur\nUso Mesada Dari\n42\nalmoco")?.category).toBe("Uso Mesada Dari");
  });
});


describe("parsePersonalCommand", () => {
  it("interpreta relatorio mensal", () => {
    const command = parsePersonalCommand(
      "fin-darithur\nrelatorio\nmes\n09/2026",
      new Date("2026-09-21T12:00:00-03:00")
    );

    expect(command).toMatchObject({
      trigger: "finance",
      type: "report",
      kind: "month",
      month: 8,
      year: 2026
    });
  });

  it("interpreta remocao de valor", () => {
    const command = parsePersonalCommand(
      "fin-darithur\nremover\nMercado\n85,90\ncompra duplicada\n22/09/2026",
      new Date("2026-09-21T12:00:00-03:00")
    );

    expect(command).toMatchObject({
      trigger: "finance",
      type: "remove",
      category: "Mercado",
      amount: 85.9,
      description: "compra duplicada"
    });
  });

  it("interpreta necessidade com data opcional", () => {
    const command = parsePersonalCommand(
      "fin-darithur\nnecessidade\nFiltro de agua\n22/09/2026",
      new Date("2026-09-21T12:00:00-03:00")
    );

    expect(command).toMatchObject({
      trigger: "finance",
      type: "need",
      item: "Filtro de agua"
    });
  });

  it("interpreta inclusao de itens na lista de compras", () => {
    const command = parsePersonalCommand(
      "fin-darithur\ncompras\narroz, tomate, cebola"
    );

    expect(command).toMatchObject({
      trigger: "finance",
      type: "shopping-list",
      action: "add",
      items: ["arroz", "tomate", "cebola"]
    });
  });

  it("interpreta remocao de itens feitos da lista de compras", () => {
    const command = parsePersonalCommand(
      "fin-darithur\ncompras feita\narroz, tomate, cebola"
    );

    expect(command).toMatchObject({
      trigger: "finance",
      type: "shopping-list",
      action: "remove",
      items: ["arroz", "tomate", "cebola"]
    });
  });

  it("interpreta consulta da lista de compras", () => {
    const command = parsePersonalCommand("fin-darithur\nlista compras");

    expect(command).toMatchObject({
      trigger: "finance",
      type: "shopping-list",
      action: "list",
      items: []
    });
  });

  it("interpreta inclusao de tarefas", () => {
    const command = parsePersonalCommand(
      "fin-darithur\ntarefas\naspirar casa, limpar churrasqueira, passar produto na pedra"
    );

    expect(command).toMatchObject({
      trigger: "finance",
      type: "task-list",
      action: "add",
      items: ["aspirar casa", "limpar churrasqueira", "passar produto na pedra"]
    });
  });

  it("interpreta consulta de tarefas", () => {
    const command = parsePersonalCommand("fin-darithur\nlistar tarefas");

    expect(command).toMatchObject({
      trigger: "finance",
      type: "task-list",
      action: "list",
      items: []
    });
  });

  it("interpreta o agente de futebol bote certo", () => {
    const command = parsePersonalCommand("agente-bote-certo\ngol\nBraza\n2");

    expect(command).toMatchObject({
      trigger: "football",
      type: "football-update",
      metric: "Gols",
      athlete: "Braza",
      amount: 2
    });
  });

  it("interpreta lote mensal do agente de futebol", () => {
    const command = parsePersonalCommand(
      [
        'agente-bote-certo',
        'Setembro',
        'Braza,1,2,3,0,0',
        'Igao,2',
        'Luca'
      ].join(String.fromCharCode(10)),
      new Date("2026-09-21T12:00:00-03:00")
    );

    expect(command).toMatchObject({
      trigger: "football",
      type: "football-batch",
      month: 8,
      updates: [
        { athlete: 'Braza', values: [1, 2, 3, 0, 0, 1] },
        { athlete: 'Igao', values: [2, 0, 0, 0, 0, 1] },
        { athlete: 'Luca', values: [0, 0, 0, 0, 0, 1] }
      ]
    });
  });
});


describe("formatDailySummaryMessage", () => {
  it("formata resumo do mes e necessidades abertas", () => {
    const text = formatDailySummaryMessage(
      "Setembro",
      2026,
      [
        { category: "Mercado", amount: 120.5 },
        { category: "Luz", amount: 80 }
      ],
      ["Filtro de agua", "Gas"]
    );

    const normalizedText = text.replace(/\u00a0/g, " ");

    expect(normalizedText).toContain("Resumo do mes ate hoje:");
    expect(normalizedText).toContain("Setembro/2026");
    expect(normalizedText).toContain("Total: R$ 200,50");
    expect(normalizedText).toContain("Mercado: R$ 120,50");
    expect(normalizedText).toContain("Necessidades:");
    expect(normalizedText).toContain("- Filtro de agua");
  });
});

describe("formatShoppingList", () => {
  it("lista um item por linha", () => {
    expect(formatShoppingList(["arroz", "tomate", "cebola"])).toBe(
      "Lista de compras:\n- arroz\n- tomate\n- cebola"
    );
  });

  it("informa quando a lista esta vazia", () => {
    expect(formatShoppingList([])).toBe("Lista de compras vazia.");
  });
});

describe("removeShoppingListItems", () => {
  it("remove todas as ocorrencias ignorando acentos e maiusculas", () => {
    expect(
      removeShoppingListItems(
        ["Arroz", "Tomate", "CEBOLA", "Pão", "tomate", "Leite"],
        ["arroz", "tomate", "cebola", "pao"]
      )
    ).toEqual({
      remainingItems: ["Leite"],
      removedItems: ["Arroz", "Tomate", "CEBOLA", "Pão", "tomate"]
    });
  });
});

describe("formatTaskList", () => {
  it("lista uma tarefa por linha", () => {
    expect(formatTaskList(["aspirar casa", "limpar churrasqueira"])).toBe(
      "Tarefas:\n- aspirar casa\n- limpar churrasqueira"
    );
  });

  it("informa quando nao ha tarefas", () => {
    expect(formatTaskList([])).toBe("Nenhuma tarefa cadastrada.");
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
