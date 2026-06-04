import type { AgriculturalCategory, PaymentMethod, TransactionType } from "../../domain/enums.js";

export interface ParsedTransactionMessage {
  type: TransactionType;
  amountCents: number;
  description: string;
  category: AgriculturalCategory;
  paymentMethod: PaymentMethod | null;
  occurredOn: Date;
}

const categoryKeywords: Array<{ category: AgriculturalCategory; keywords: string[] }> = [
  { category: "seeds", keywords: ["semente", "sementes", "soja", "milho"] },
  { category: "fertilizers", keywords: ["fertilizante", "adubo", "adubos", "ureia", "calcario"] },
  { category: "defensives", keywords: ["defensivo", "veneno", "herbicida", "fungicida", "inseticida", "verdict"] },
  { category: "fuel", keywords: ["combustivel", "diesel", "gasolina"] },
  { category: "machinery", keywords: ["maquina", "maquinas", "trator", "colheitadeira"] },
  { category: "maintenance", keywords: ["manutencao", "peca", "pecas", "oficina", "conserto"] },
  { category: "labor", keywords: ["mao de obra", "salario", "diaria", "funcionario"] },
  { category: "freight", keywords: ["frete", "transporte", "logistica"] },
  { category: "lease", keywords: ["arrendamento", "aluguel"] },
  { category: "irrigation", keywords: ["irrigacao"] },
  { category: "energy", keywords: ["energia", "luz"] },
  { category: "insurance", keywords: ["seguro"] },
  { category: "outsourced_services", keywords: ["servico", "servicos", "terceirizado"] },
  { category: "food", keywords: ["alimentacao", "comida", "mercado"] }
];

export function parseTransactionMessage(text: string, now = new Date()): ParsedTransactionMessage | null {
  const normalized = normalize(text);
  const type = inferType(normalized);
  if (!type) {
    return null;
  }

  const amountCents = parseAmountCents(normalized);
  if (amountCents === null) {
    return null;
  }

  return {
    type,
    amountCents,
    description: text.trim().slice(0, 240),
    category: inferCategory(normalized),
    paymentMethod: inferPaymentMethod(normalized),
    occurredOn: now
  };
}

export function parseQuickSignup(text: string): {
  name: string;
  farmName: string;
  city: string;
  state: string;
  mainActivity: string;
} | null {
  const match = text.match(/^cadastro\s+(.+)$/i);
  if (!match?.[1]) {
    return null;
  }

  const parts = match[1].split("|").map((part) => part.trim()).filter(Boolean);
  if (parts.length < 4) {
    return null;
  }

  const name = parts[0];
  const farmName = parts[1];
  const cityState = parts[2];
  const mainActivity = parts[3];
  if (!name || !farmName || !cityState || !mainActivity) {
    return null;
  }

  const [city, state = ""] = cityState.split("/").map((part) => part.trim());

  if (!city || !state) {
    return null;
  }

  return { name, farmName, city, state: state.toUpperCase(), mainActivity };
}

function inferType(text: string): TransactionType | null {
  if (/\b(recebi|recebido|vendi|venda|entrada)\b/.test(text)) {
    return "income";
  }

  if (/\b(gastei|paguei|comprei|compra|saida|despesa|custou)\b/.test(text)) {
    return "expense";
  }

  return null;
}

function parseAmountCents(text: string): number | null {
  const amountMatch =
    text.match(/r\$\s*(\d+(?:[\.,]\d{1,3})*(?:,\d{1,2})?)\s*(mil)?/) ??
    text.match(/(\d+(?:[\.,]\d{1,3})*(?:,\d{1,2})?)\s*(mil|reais|real)?/);

  if (!amountMatch?.[1]) {
    return null;
  }

  const value = parseBrazilianNumber(amountMatch[1]);
  const multiplier = amountMatch[2] === "mil" ? 1000 : 1;

  return Math.round(value * multiplier * 100);
}

function parseBrazilianNumber(raw: string): number {
  const withoutThousands = raw.replace(/\.(?=\d{3}(?:\D|$))/g, "");
  const normalized = withoutThousands.replace(",", ".");
  return Number(normalized);
}

function inferCategory(text: string): AgriculturalCategory {
  return categoryKeywords.find((entry) => entry.keywords.some((keyword) => text.includes(keyword)))?.category ?? "other";
}

function inferPaymentMethod(text: string): PaymentMethod | null {
  if (text.includes("pix")) return "pix";
  if (text.includes("dinheiro")) return "cash";
  if (text.includes("boleto")) return "boleto";
  if (text.includes("cartao") || text.includes("cartão")) return "card";
  if (text.includes("transferencia") || text.includes("transferência")) return "transfer";
  return null;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}
