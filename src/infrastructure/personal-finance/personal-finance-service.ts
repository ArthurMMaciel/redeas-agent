import { createSign } from "node:crypto";
import { readFile } from "node:fs/promises";
import { env } from "../config/env.js";

const categories = [
  "Condominio",
  "Gas",
  "Luz",
  "Internet",
  "Unimed",
  "Mercado",
  "Gasolina",
  "Cartao",
  "Banho Sukita",
  "Reserva",
  "Investimentos",
  "Lazer",
  "Caixinha",
  "Viagem",
  "Moto",
  "Saude",
  "MEI",
  "Rino",
  "Imprevistos",
  "Obras"
] as const;

const categoryDisplayNames: Record<(typeof categories)[number], string> = {
  Condominio: "Condom\u00ednio",
  Gas: "G\u00e1s",
  Luz: "Luz",
  Internet: "Internet",
  Unimed: "Unimed",
  Mercado: "Mercado",
  Gasolina: "Gasolina",
  Cartao: "Cart\u00e3o",
  "Banho Sukita": "Banho Sukita",
  Reserva: "Reserva",
  Investimentos: "Investimentos",
  Lazer: "Lazer",
  Caixinha: "Caixinha",
  Viagem: "Viagem",
  Moto: "Moto",
  Saude: "Sa\u00fade",
  MEI: "MEI",
  Rino: "Rino",
  Imprevistos: "Imprevistos",
  Obras: "Obras"
};

const monthSheetNames = [
  "Janeiro",
  "Fevereiro",
  "Mar\u00e7o",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro"
] as const;

const financeTrigger = "fin-darithur";

interface PersonalFinanceMessage {
  phone: string;
  text: string;
  messageId: string;
  receivedAt: Date;
}

interface ParsedFinanceCommand {
  category: (typeof categories)[number];
  amount: number;
  description: string;
  date: Date;
}

interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

interface GoogleToken {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export class PersonalFinanceService {
  private accessToken: { value: string; expiresAt: number } | null = null;

  canHandle(input: { phone: string; text: string; senderId?: string }): boolean {
    return (
      (this.isAllowedPhone(input.phone) || this.isAllowedLid(input.senderId)) &&
      looksLikeFinanceCommand(input.text)
    );
  }

  async process(input: PersonalFinanceMessage): Promise<string> {
    if (!this.isConfigured()) {
      return "Financeiro pessoal ainda nao esta configurado no servidor.";
    }

    const command = parseFinanceCommand(input.text, input.receivedAt);
    if (!command) {
      return [
        "Nao consegui entender o lancamento.",
        "Use: fin mercado 85,90 descricao",
        `Categorias: ${categories.join(", ")}`
      ].join("\n\n");
    }

    const sheets = await this.createSheetsClient();
    const duplicate = await this.wasProcessed(sheets, input.messageId);
    if (duplicate) {
      return "Esse lancamento ja tinha sido registrado. Nao somei novamente.";
    }

    const monthSheet = getMonthSheetName(command.date);
    const total = await this.addToMonthlyTotal(sheets, monthSheet, command);
    await this.appendHistory(sheets, input, command, monthSheet);

    return [
      "Lancamento registrado:",
      `${categoryDisplayNames[command.category]} - ${formatCurrency(command.amount)}`,
      command.description,
      `Data: ${formatBrazilianDate(command.date)}`,
      `Total de ${categoryDisplayNames[command.category]} em ${monthSheet}: ${formatCurrency(total)}`
    ].join("\n");
  }

  private isConfigured(): boolean {
    return Boolean(
      env.PERSONAL_FINANCE_GOOGLE_CREDENTIALS_PATH &&
        env.PERSONAL_FINANCE_GOOGLE_SHEET_ID
    );
  }

  private isAllowedPhone(rawPhone: string): boolean {
    const allowed = env.PERSONAL_FINANCE_ALLOWED_PHONES?.split(",")
      .map((phone) => normalizeBrazilianPhone(phone))
      .filter(Boolean);
    if (!allowed?.length) {
      return false;
    }

    return allowed.includes(normalizeBrazilianPhone(rawPhone));
  }

  private isAllowedLid(rawSenderId?: string): boolean {
    if (!rawSenderId) {
      return false;
    }

    const allowed = env.PERSONAL_FINANCE_ALLOWED_LIDS?.split(",")
      .map((lid) => normalizeWhatsAppId(lid))
      .filter(Boolean);
    if (!allowed?.length) {
      return false;
    }

    return allowed.includes(normalizeWhatsAppId(rawSenderId));
  }

  private async createSheetsClient(): Promise<GoogleSheetsClient> {
    const credentialsPath = env.PERSONAL_FINANCE_GOOGLE_CREDENTIALS_PATH;
    const spreadsheetId = env.PERSONAL_FINANCE_GOOGLE_SHEET_ID;
    if (!credentialsPath || !spreadsheetId) {
      throw new Error("Personal finance Google Sheets env is missing");
    }

    const rawCredentials = await readFile(credentialsPath, "utf8");
    const credentials = JSON.parse(rawCredentials) as ServiceAccountCredentials;
    const accessToken = await this.getAccessToken(credentials);
    return new GoogleSheetsClient(spreadsheetId, accessToken);
  }

  private async getAccessToken(credentials: ServiceAccountCredentials): Promise<string> {
    if (this.accessToken && this.accessToken.expiresAt > Date.now() + 60_000) {
      return this.accessToken.value;
    }

    const now = Math.floor(Date.now() / 1000);
    const assertion = createJwtAssertion(credentials, {
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: credentials.token_uri ?? "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600
    });

    const response = await fetch(credentials.token_uri ?? "https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion
      })
    });

    if (!response.ok) {
      throw new Error(`Google auth failed with status ${response.status}: ${await response.text()}`);
    }

    const token = (await response.json()) as GoogleToken;
    this.accessToken = {
      value: token.access_token,
      expiresAt: Date.now() + token.expires_in * 1000
    };
    return token.access_token;
  }

  private async wasProcessed(sheets: GoogleSheetsClient, messageId: string): Promise<boolean> {
    const rows = await sheets.getValues(`${quoteSheet(env.PERSONAL_FINANCE_LANCAMENTOS_SHEET)}!H:H`);
    return rows.some((row) => row[0] === messageId);
  }

  private async appendHistory(
    sheets: GoogleSheetsClient,
    input: PersonalFinanceMessage,
    command: ParsedFinanceCommand,
    monthSheet: string
  ): Promise<void> {
    await sheets.appendValues(`${quoteSheet(env.PERSONAL_FINANCE_LANCAMENTOS_SHEET)}!A:H`, [
      [
        new Date().toISOString(),
        formatIsoDate(command.date),
        monthSheet,
        categoryDisplayNames[command.category],
        command.description,
        command.amount,
        normalizeBrazilianPhone(input.phone),
        input.messageId
      ]
    ]);
  }

  private async addToMonthlyTotal(
    sheets: GoogleSheetsClient,
    monthSheet: string,
    command: ParsedFinanceCommand
  ): Promise<number> {
    const values = await sheets.getValues(`${quoteSheet(monthSheet)}!A:Z`);
    const categoryColumnIndex = columnNameToIndex(env.PERSONAL_FINANCE_MONTH_CATEGORY_COLUMN);
    const valueColumnIndex = columnNameToIndex(env.PERSONAL_FINANCE_MONTH_VALUE_COLUMN);
    const rowIndex = values.findIndex(
      (row) => normalizeText(row[categoryColumnIndex] ?? "") === normalizeText(command.category)
    );

    if (rowIndex < 0) {
      throw new Error(`Category ${command.category} was not found in sheet ${monthSheet}`);
    }

    const currentValue = parseMoney(String(values[rowIndex]?.[valueColumnIndex] ?? "")) ?? 0;
    const newValue = currentValue + command.amount;
    const cell = `${env.PERSONAL_FINANCE_MONTH_VALUE_COLUMN}${rowIndex + 1}`;
    await sheets.updateValues(`${quoteSheet(monthSheet)}!${cell}`, [[newValue]]);
    return newValue;
  }
}

class GoogleSheetsClient {
  constructor(
    private readonly spreadsheetId: string,
    private readonly accessToken: string
  ) {}

  async getValues(range: string): Promise<string[][]> {
    const response = await this.request(
      `values/${encodeURIComponent(range)}?majorDimension=ROWS`
    );
    const payload = (await response.json()) as { values?: string[][] };
    return payload.values ?? [];
  }

  async appendValues(range: string, values: unknown[][]): Promise<void> {
    await this.request(`values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`, {
      method: "POST",
      body: JSON.stringify({ values })
    });
  }

  async updateValues(range: string, values: unknown[][]): Promise<void> {
    await this.request(`values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, {
      method: "PUT",
      body: JSON.stringify({ values })
    });
  }

  private async request(path: string, init: RequestInit = {}): Promise<Response> {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(this.spreadsheetId)}/${path}`,
      {
        ...init,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
          ...init.headers
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Google Sheets API failed with status ${response.status}: ${await response.text()}`);
    }

    return response;
  }
}

export function parseFinanceCommand(
  rawText: string,
  now: Date = new Date()
): ParsedFinanceCommand | null {
  const lines = rawText
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) {
    return null;
  }

  const firstLine = lines[0] ?? "";
  const hasTrigger = normalizeText(firstLine) === financeTrigger;
  const hasLegacyPrefix = normalizeText(firstLine).startsWith("fin ");
  const body = hasTrigger ? lines[1] ?? "" : hasLegacyPrefix ? firstLine.slice(4).trim() : firstLine;
  const category = categories.find((item) =>
    normalizeText(body) === normalizeText(item) ||
      normalizeText(body).startsWith(`${normalizeText(item)} `)
  );
  if (!category) {
    return null;
  }

  if (hasTrigger) {
    const amount = parseMoney(lines[2] ?? "");
    if (!amount || amount <= 0) {
      return null;
    }

    const description = lines[3] && !isDateText(lines[3]) ? lines[3] : categoryDisplayNames[category];
    const dateText = lines[4] ?? (lines[3] && isDateText(lines[3]) ? lines[3] : "");
    return {
      category,
      amount,
      description,
      date: dateText ? parseDateFromText(dateText, now) : now
    };
  }

  const remainder = body.slice(category.length).trim();
  const amountMatch = remainder.match(/(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+(?:[,.]\d{1,2})?)/i);
  if (!amountMatch?.[1]) {
    return null;
  }

  const amount = parseMoney(amountMatch[1]);
  if (!amount || amount <= 0) {
    return null;
  }

  const afterAmount = remainder.slice((amountMatch.index ?? 0) + amountMatch[0].length).trim();
  const parsedDate = parseDateFromText(afterAmount, now);
  const description = removeDateTerms(afterAmount).trim() || categoryDisplayNames[category];

  return {
    category,
    amount,
    description,
    date: parsedDate
  };
}

function looksLikeFinanceCommand(rawText: string): boolean {
  const firstLine = rawText.replace(/\r/g, "").split("\n")[0]?.trim() ?? "";
  const normalizedFirstLine = normalizeText(firstLine);
  return normalizedFirstLine === financeTrigger;
}

export function normalizeBrazilianPhone(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return digits;
}

export function parseMoney(raw: string): number | null {
  const clean = raw.replace(/[^\d,.]/g, "");
  if (!clean) {
    return null;
  }

  const normalized = clean.includes(",")
    ? clean.replace(/\./g, "").replace(",", ".")
    : clean;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDateFromText(text: string, now: Date): Date {
  const normalized = normalizeText(text);
  if (/\bontem\b/.test(normalized)) {
    return addDays(now, -1);
  }

  const explicit = text.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (explicit?.[1] && explicit[2]) {
    const day = Number(explicit[1]);
    const month = Number(explicit[2]) - 1;
    const year = explicit[3] ? normalizeYear(Number(explicit[3])) : now.getFullYear();
    const result = new Date(year, month, day);
    if (result.getFullYear() !== year || result.getMonth() !== month || result.getDate() !== day) {
      return now;
    }
    return result;
  }

  return now;
}

function isDateText(text: string): boolean {
  return /^\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?$/.test(text.trim());
}

function getMonthSheetName(date: Date): string {
  const configured = env.PERSONAL_FINANCE_MONTH_SHEET_NAMES?.split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return configured?.[date.getMonth()] ?? monthSheetNames[date.getMonth()] ?? monthSheetNames[0];
}

function removeDateTerms(text: string): string {
  return text
    .replace(/\bhoje\b/gi, "")
    .replace(/\bontem\b/gi, "")
    .replace(/\bdia\s+\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/gi, "")
    .replace(/\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/g, "")
    .trim();
}

function createJwtAssertion(
  credentials: ServiceAccountCredentials,
  claims: { scope: string; aud: string; iat: number; exp: number }
): string {
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(
    JSON.stringify({
      iss: credentials.client_email,
      scope: claims.scope,
      aud: claims.aud,
      iat: claims.iat,
      exp: claims.exp
    })
  );
  const unsigned = `${header}.${payload}`;
  const signature = createSign("RSA-SHA256")
    .update(unsigned)
    .sign(credentials.private_key);
  return `${unsigned}.${base64Url(signature)}`;
}

function base64Url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function normalizeYear(year: number): number {
  return year < 100 ? 2000 + year : year;
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeWhatsAppId(value: string): string {
  return value.trim().toLowerCase();
}

function columnNameToIndex(column: string): number {
  const normalized = column.trim().toUpperCase();
  let index = 0;
  for (const char of normalized) {
    index = index * 26 + char.charCodeAt(0) - 64;
  }
  return index - 1;
}

function quoteSheet(sheetName: string): string {
  return `'${sheetName.replace(/'/g, "''")}'`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

function formatBrazilianDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo"
  }).format(date);
}

function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
