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
  "Seguro",
  "IPVA",
  "IPTU",
  "Muay-thai",
  "Imprevistos",
  "Obras",
  "Uso Mesada Arthur",
  "Uso Mesada Dari"
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
  Seguro: "Seguro",
  IPVA: "IPVA",
  IPTU: "IPTU",
  "Muay-thai": "Muay-thai",
  Imprevistos: "Imprevistos",
  Obras: "Obras",
  "Uso Mesada Arthur": "Uso Mesada Arthur",
  "Uso Mesada Dari": "Uso Mesada Dari"
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

const footballAthletes = [
  "Braza",
  "Igao",
  "Joao Gustavo",
  "Luca",
  "Parra",
  "Francis",
  "Guga",
  "Guiso",
  "Jon Vlogs",
  "Caverna",
  "Leonardo",
  "Marcola",
  "Guerra",
  "Prince",
  "Chape",
  "Vini",
  "Wellington",
  "Joao Vitor"
] as const;

const footballAthleteDisplayNames: Record<(typeof footballAthletes)[number], string> = {
  Braza: "Braza",
  Igao: "Ig\u00e3o",
  "Joao Gustavo": "Jo\u00e3o Gustavo",
  Luca: "Luca",
  Parra: "Parra",
  Francis: "Francis",
  Guga: "Guga",
  Guiso: "Guiso",
  "Jon Vlogs": "Jon Vlogs",
  Caverna: "Caverna",
  Leonardo: "Leonardo",
  Marcola: "Marcola",
  Guerra: "Guerra",
  Prince: "Prince",
  Chape: "Chape",
  Vini: "Vini",
  Wellington: "Wellington",
  "Joao Vitor": "Jo\u00e3o Vitor"
};

const financeTrigger = "fin-darithur";
const footballTrigger = "agente-bote-certo";

interface PersonalFinanceMessage {
  phone: string;
  text: string;
  messageId: string;
  receivedAt: Date;
}

interface ParsedFinanceEntryCommand {
  type: "entry";
  category: (typeof categories)[number];
  amount: number;
  description: string;
  date: Date;
}

interface ParsedFinanceRemoveCommand {
  type: "remove";
  category: (typeof categories)[number];
  amount: number;
  description: string;
  date: Date;
}

type ReportKind =
  | "month"
  | "all-months"
  | "categories"
  | "category"
  | "day"
  | "days";

interface ParsedFinanceReportCommand {
  type: "report";
  kind: ReportKind;
  month?: number;
  year?: number;
  category?: (typeof categories)[number];
  date?: Date;
}

interface ParsedNeedCommand {
  type: "need";
  item: string;
  boughtAt?: Date;
}

type FootballReportKind = "resumo" | "gols" | "gols-contra" | "assistencias" | "amarelos" | "vermelhos" | "jogos";
type FootballMetricName = "Gols" | "Gols contra" | "Assistencias" | "Cartoes amarelos" | "Cartoes vermelhos" | "Jogos";

interface ParsedFootballUpdateCommand {
  trigger: "football";
  type: "football-update";
  metric: FootballMetricName;
  athlete: (typeof footballAthletes)[number];
  amount: number;
  month: number;
}

interface FootballAthleteUpdate {
  athlete: (typeof footballAthletes)[number];
  values: number[];
}

interface ParsedFootballBatchCommand {
  trigger: "football";
  type: "football-batch";
  month: number;
  updates: FootballAthleteUpdate[];
}

interface ParsedFootballReportCommand {
  trigger: "football";
  type: "football-report";
  kind: FootballReportKind;
  month: number;
}

type ParsedFinanceCommand =
  | ParsedFinanceEntryCommand
  | ParsedFinanceRemoveCommand
  | ParsedFinanceReportCommand
  | ParsedNeedCommand;

type ParsedPersonalCommand =
  | ({ trigger: "finance" } & ParsedFinanceCommand)
  | ParsedFootballUpdateCommand
  | ParsedFootballBatchCommand
  | ParsedFootballReportCommand;

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

interface HistoryRow {
  registeredAt: string;
  date: string;
  month: string;
  category: string;
  description: string;
  amount: number;
  phone: string;
  messageId: string;
}

interface FootballRow {
  rowIndex: number;
  athlete: string;
  goals: number;
  ownGoals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  games: number;
}

export class PersonalFinanceService {
  private accessToken: { value: string; expiresAt: number } | null = null;

  canHandle(input: { phone: string; text: string; senderId?: string }): boolean {
    return (
      (this.isAllowedPhone(input.phone) || this.isAllowedLid(input.senderId)) &&
      looksLikePersonalCommand(input.text)
    );
  }

  async process(input: PersonalFinanceMessage): Promise<string> {
    if (!this.isConfigured()) {
      return "Financeiro pessoal ainda nao esta configurado no servidor.";
    }

    const command = parsePersonalCommand(input.text, input.receivedAt);
    if (!command) {
      return invalidCommandMessage();
    }

    if (command.trigger === "football") {
      return this.processFootballCommand(command);
    }

    const sheets = await this.createSheetsClient(env.PERSONAL_FINANCE_GOOGLE_SHEET_ID);

    if (command.type === "report") {
      return this.buildFinanceReport(sheets, command, input.receivedAt);
    }

    if (command.type === "need") {
      await sheets.appendValues(`${quoteSheet(env.PERSONAL_FINANCE_NECESSIDADES_SHEET)}!A:B`, [
        [command.item, command.boughtAt ? formatBrazilianDate(command.boughtAt) : ""]
      ]);
      return [
        "Necessidade registrada:",
        command.item,
        command.boughtAt ? `Comprado em: ${formatBrazilianDate(command.boughtAt)}` : "Comprado em: em aberto"
      ].join("\n");
    }

    const duplicate = await this.wasProcessed(sheets, input.messageId);
    if (duplicate) {
      return "Essa mensagem ja tinha sido processada. Nao mexi na planilha novamente.";
    }

    if (command.type === "remove") {
      const monthSheet = getMonthSheetName(command.date);
      const total = await this.addToMonthlyTotal(sheets, monthSheet, {
        ...command,
        amount: -command.amount
      });
      await this.appendHistory(sheets, input, {
        ...command,
        amount: -command.amount,
        description: `REMOVIDO: ${command.description}`
      }, monthSheet);

      return [
        "Valor removido:",
        `${categoryDisplayNames[command.category]} - ${formatCurrency(command.amount)}`,
        command.description,
        `Data: ${formatBrazilianDate(command.date)}`,
        `Novo total de ${categoryDisplayNames[command.category]} em ${monthSheet}: ${formatCurrency(total)}`
      ].join("\n");
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

  private async createSheetsClient(spreadsheetId?: string): Promise<GoogleSheetsClient> {
    const credentialsPath = env.PERSONAL_FINANCE_GOOGLE_CREDENTIALS_PATH;
    if (!credentialsPath || !spreadsheetId) {
      throw new Error("Google Sheets env is missing");
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
    command: Pick<ParsedFinanceEntryCommand, "category" | "amount" | "description" | "date">,
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
    command: Pick<ParsedFinanceEntryCommand, "category" | "amount">
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

  private async buildFinanceReport(
    sheets: GoogleSheetsClient,
    command: ParsedFinanceReportCommand,
    now: Date
  ): Promise<string> {
    if (command.kind === "month") {
      const month = command.month ?? now.getMonth();
      const year = command.year ?? now.getFullYear();
      const report = await this.readMonthReport(sheets, month);
      return formatMonthReport(report.monthSheet, year, report.items);
    }

    if (command.kind === "all-months") {
      const reports = await this.readAllMonthReports(sheets);
      return formatAllMonthsReport(reports);
    }

    if (command.kind === "categories") {
      const reports = await this.readAllMonthReports(sheets);
      return formatCategoriesReport(reports);
    }

    if (command.kind === "category" && command.category) {
      const reports = await this.readAllMonthReports(sheets);
      return formatSingleCategoryReport(command.category, reports, command.month);
    }

    const history = await this.readHistory(sheets);
    if (command.kind === "day") {
      const date = command.date ?? now;
      return formatDayReport(date, history);
    }

    const month = command.month ?? now.getMonth();
    const year = command.year ?? now.getFullYear();
    return formatDaysReport(month, year, history);
  }

  private async readMonthReport(
    sheets: GoogleSheetsClient,
    month: number
  ): Promise<{ monthSheet: string; items: Array<{ category: string; amount: number }> }> {
    const monthSheet = getMonthSheetName(new Date(2026, month, 1));
    const values = await sheets.getValues(`${quoteSheet(monthSheet)}!A:Z`);
    const categoryColumnIndex = columnNameToIndex(env.PERSONAL_FINANCE_MONTH_CATEGORY_COLUMN);
    const valueColumnIndex = columnNameToIndex(env.PERSONAL_FINANCE_MONTH_VALUE_COLUMN);
    const items = values
      .map((row) => ({
        category: String(row[categoryColumnIndex] ?? "").trim(),
        amount: parseMoney(String(row[valueColumnIndex] ?? "")) ?? 0
      }))
      .filter((item) => item.category && item.amount !== 0);
    return { monthSheet, items };
  }

  private async readAllMonthReports(
    sheets: GoogleSheetsClient
  ): Promise<Array<{ monthSheet: string; items: Array<{ category: string; amount: number }> }>> {
    const reports = [];
    for (let month = 0; month < 12; month += 1) {
      reports.push(await this.readMonthReport(sheets, month));
    }
    return reports;
  }

  private async readHistory(sheets: GoogleSheetsClient): Promise<HistoryRow[]> {
    const rows = await sheets.getValues(`${quoteSheet(env.PERSONAL_FINANCE_LANCAMENTOS_SHEET)}!A:H`);
    return rows.slice(1).map((row) => ({
      registeredAt: row[0] ?? "",
      date: row[1] ?? "",
      month: row[2] ?? "",
      category: row[3] ?? "",
      description: row[4] ?? "",
      amount: parseMoney(String(row[5] ?? "")) ?? 0,
      phone: row[6] ?? "",
      messageId: row[7] ?? ""
    }));
  }

  private async processFootballCommand(command: ParsedFootballUpdateCommand | ParsedFootballBatchCommand | ParsedFootballReportCommand): Promise<string> {
    if (!env.PERSONAL_FOOTBALL_GOOGLE_SHEET_ID) {
      return "Planilha do futebol ainda nao esta configurada. Defina PERSONAL_FOOTBALL_GOOGLE_SHEET_ID.";
    }

    const sheets = await this.createSheetsClient(env.PERSONAL_FOOTBALL_GOOGLE_SHEET_ID);
    const sheetName = getMonthSheetName(new Date(2026, command.month, 1));
    const rows = await readFootballRows(sheets, sheetName);

    if (command.type === "football-report") {
      return formatFootballReport(command.kind, sheetName, rows);
    }

    const updates = command.type === "football-batch"
      ? command.updates
      : [{ athlete: command.athlete, values: valuesForSingleFootballMetric(command.metric, command.amount) }];
    const summaries: string[] = [];

    for (const update of updates) {
      const row = rows.find((item) => normalizeText(item.athlete) === normalizeText(update.athlete));
      if (!row) {
        throw new Error(`Athlete ${update.athlete} was not found in football sheet ${sheetName}`);
      }

      const currentValues = footballRowValues(row);
      const nextValues = currentValues.map((current, index) => current + (update.values[index] ?? 0));
      await sheets.updateValues(`${quoteSheet(sheetName)}!B${row.rowIndex}:G${row.rowIndex}`, [nextValues]);
      summaries.push(formatFootballUpdateSummary(update.athlete, update.values));
    }

    return [
      `Bote Certo atualizado em ${sheetName}:`,
      ...summaries
    ].join("\n");
  }
}

class GoogleSheetsClient {
  constructor(
    private readonly spreadsheetId: string,
    private readonly accessToken: string
  ) {}

  async getSheetTitles(): Promise<string[]> {
    const response = await this.request("?fields=sheets(properties(title))");
    const payload = (await response.json()) as {
      sheets?: Array<{ properties?: { title?: string } }>;
    };
    return payload.sheets?.map((sheet) => sheet.properties?.title).filter(isString) ?? [];
  }

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
): ParsedFinanceEntryCommand | null {
  const command = parsePersonalCommand(rawText, now);
  return command?.trigger === "finance" && command.type === "entry" ? command : null;
}

export function parsePersonalCommand(
  rawText: string,
  now: Date = new Date()
): ParsedPersonalCommand | null {
  const lines = getLines(rawText);
  const firstLine = lines[0] ?? "";
  const normalizedFirstLine = normalizeText(firstLine);

  if (normalizedFirstLine === footballTrigger) {
    return parseFootballCommand(lines, now);
  }

  const financeCommand = parseFinanceBody(lines, now);
  return financeCommand ? { trigger: "finance", ...financeCommand } : null;
}

function parseFinanceBody(lines: string[], now: Date): ParsedFinanceCommand | null {
  if (!lines.length) {
    return null;
  }

  const firstLine = lines[0] ?? "";
  const hasTrigger = normalizeText(firstLine) === financeTrigger;
  const hasLegacyPrefix = normalizeText(firstLine).startsWith("fin ");
  const body = hasTrigger ? lines[1] ?? "" : hasLegacyPrefix ? firstLine.slice(4).trim() : firstLine;
  const action = normalizeText(body);

  if (hasTrigger && ["relatorio", "relatorio financeiro", "report"].includes(action)) {
    return parseReportCommand(lines.slice(2), now);
  }

  if (hasTrigger && ["remover", "remove", "estornar", "subtrair"].includes(action)) {
    return parseRemoveCommand(lines.slice(2), now);
  }

  if (hasTrigger && ["necessidade", "necessidades", "comprar", "lista"].includes(action)) {
    return parseNeedCommand(lines.slice(2), now);
  }

  const category = findCategory(body);
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
      type: "entry",
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
    type: "entry",
    category,
    amount,
    description,
    date: parsedDate
  };
}

function parseReportCommand(lines: string[], now: Date): ParsedFinanceReportCommand {
  const kindText = normalizeText(lines[0] ?? "mes");
  const joined = lines.join(" ");

  if (["todos", "total", "meses"].includes(kindText)) {
    return { type: "report", kind: "all-months" };
  }

  if (["categorias", "categoria total", "por categoria"].includes(kindText)) {
    return { type: "report", kind: "categories" };
  }

  if (kindText === "categoria") {
    const category = findCategory(lines[1] ?? "");
    if (!category) {
      return { type: "report", kind: "categories" };
    }

    const monthInfo = parseMonthText(lines[2] ?? "", now);
    return { type: "report", kind: "category", category, ...monthInfo };
  }

  if (kindText === "dia") {
    return { type: "report", kind: "day", date: parseDateFromText(lines[1] ?? "", now) };
  }

  if (["dias", "diario", "diario mensal"].includes(kindText)) {
    return { type: "report", kind: "days", ...parseMonthText(lines[1] ?? "", now) };
  }

  if (kindText === "mes") {
    return { type: "report", kind: "month", ...parseMonthText(lines[1] ?? joined, now) };
  }

  const category = findCategory(lines[0] ?? "");
  if (category) {
    return { type: "report", kind: "category", category, ...parseMonthText(lines[1] ?? "", now) };
  }

  return { type: "report", kind: "month", ...parseMonthText(joined, now) };
}

function parseRemoveCommand(lines: string[], now: Date): ParsedFinanceRemoveCommand | null {
  const category = findCategory(lines[0] ?? "");
  const amount = parseMoney(lines[1] ?? "");
  if (!category || !amount || amount <= 0) {
    return null;
  }

  const dateText = lines.find((line, index) => index >= 2 && isDateText(line));
  const description = lines.find((line, index) => index >= 2 && !isDateText(line)) ?? categoryDisplayNames[category];
  return {
    type: "remove",
    category,
    amount,
    description,
    date: dateText ? parseDateFromText(dateText, now) : now
  };
}

function parseNeedCommand(lines: string[], now: Date): ParsedNeedCommand | null {
  const item = lines[0]?.trim();
  if (!item) {
    return null;
  }

  const boughtAtText = lines[1]?.trim();
  return boughtAtText
    ? { type: "need", item, boughtAt: parseDateFromText(boughtAtText, now) }
    : { type: "need", item };
}

function parseFootballCommand(
  lines: string[],
  now: Date
): ParsedFootballUpdateCommand | ParsedFootballBatchCommand | ParsedFootballReportCommand | null {
  const action = normalizeText(lines[1] ?? "");
  if (["relatorio", "resumo", "ranking"].includes(action)) {
    const kindText = normalizeText(lines[2] ?? "resumo");
    const monthInfo = parseMonthText(lines[3] ?? "", now);
    return {
      trigger: "football",
      type: "football-report",
      kind: parseFootballReportKind(kindText),
      month: monthInfo.month ?? now.getMonth()
    };
  }

  const metric = parseFootballMetric(action);
  const athlete = findAthlete(lines[2] ?? "");
  const amount = parsePositiveInteger(lines[3] ?? "") ?? 1;
  if (metric && athlete) {
    return {
      trigger: "football",
      type: "football-update",
      metric,
      athlete,
      amount,
      month: now.getMonth()
    };
  }

  const payloadLines = lines.slice(1);
  const firstPayloadLine = payloadLines[0] ?? "";
  const monthInfo = !looksLikeFootballUpdateLine(firstPayloadLine)
    ? parseMonthText(firstPayloadLine, now)
    : {};
  const month = monthInfo.month ?? now.getMonth();
  const updateLines = typeof monthInfo.month === "number" ? payloadLines.slice(1) : payloadLines;
  const updates = updateLines
    .map(parseFootballUpdateLine)
    .filter((item): item is FootballAthleteUpdate => Boolean(item));

  if (!updates.length) {
    return null;
  }

  return {
    trigger: "football",
    type: "football-batch",
    month,
    updates
  };
}

function parseFootballUpdateLine(line: string): FootballAthleteUpdate | null {
  const parts = line.split(",").map((part) => part.trim()).filter(Boolean);
  const athlete = findAthlete(parts[0] ?? "");
  if (!athlete) {
    return null;
  }

  const values = parts.slice(1, 7).map((part) => parseNonNegativeInteger(part));
  if (!values.length || values.some((value) => value === null)) {
    return null;
  }

  return {
    athlete,
    values: values.map((value) => value ?? 0)
  };
}

function looksLikeFootballUpdateLine(line: string): boolean {
  return line.includes(",") && Boolean(findAthlete(line.split(",")[0] ?? ""));
}

function parseFootballMetric(action: string): FootballMetricName | null {
  if (action === "gol" || action === "gols") return "Gols";
  if (action === "gol contra" || action === "gols contra") return "Gols contra";
  if (action === "assistencia" || action === "assistencias") return "Assistencias";
  if (action === "amarelo" || action === "cartao amarelo" || action === "cartoes amarelos") return "Cartoes amarelos";
  if (action === "vermelho" || action === "cartao vermelho" || action === "cartoes vermelhos") return "Cartoes vermelhos";
  if (action === "jogo" || action === "jogos") return "Jogos";
  return null;
}

function parseFootballReportKind(kind: string): FootballReportKind {
  if (kind === "gols") return "gols";
  if (kind === "gols contra" || kind === "gols-contra") return "gols-contra";
  if (kind === "assistencia" || kind === "assistencias") return "assistencias";
  if (kind === "amarelo" || kind === "amarelos" || kind === "cartoes amarelos") return "amarelos";
  if (kind === "vermelho" || kind === "vermelhos" || kind === "cartoes vermelhos") return "vermelhos";
  if (kind === "jogo" || kind === "jogos") return "jogos";
  return "resumo";
}
function looksLikePersonalCommand(rawText: string): boolean {
  const firstLine = rawText.replace(/\r/g, "").split("\n")[0]?.trim() ?? "";
  const normalizedFirstLine = normalizeText(firstLine);
  return normalizedFirstLine === financeTrigger || normalizedFirstLine === footballTrigger;
}

export function normalizeBrazilianPhone(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return digits;
}

export function parseMoney(raw: string): number | null {
  const clean = raw.replace(/[^\d,.+-]/g, "");
  if (!clean || clean === "-" || clean === "+") {
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

function parseMonthText(text: string, now: Date): { month?: number; year?: number } {
  const normalized = normalizeText(text);
  const numeric = normalized.match(/\b(\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (numeric?.[1]) {
    const month = Number(numeric[1]) - 1;
    if (month >= 0 && month <= 11) {
      return {
        month,
        year: numeric[2] ? normalizeYear(Number(numeric[2])) : now.getFullYear()
      };
    }
  }

  const month = monthSheetNames.findIndex((item) => normalizeText(item) === normalized);
  if (month >= 0) {
    return { month, year: now.getFullYear() };
  }

  return {};
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

function findCategory(text: string): (typeof categories)[number] | undefined {
  const normalized = normalizeText(text);
  return categories.find((item) =>
    normalized === normalizeText(item) ||
    normalized === normalizeText(categoryDisplayNames[item]) ||
    normalized.startsWith(`${normalizeText(item)} `) ||
    normalized.startsWith(`${normalizeText(categoryDisplayNames[item])} `)
  );
}

function findAthlete(text: string): (typeof footballAthletes)[number] | undefined {
  const normalized = normalizeText(text);
  return footballAthletes.find((item) =>
    normalized === normalizeText(item) ||
    normalized === normalizeText(footballAthleteDisplayNames[item])
  );
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

function getLines(rawText: string): string[] {
  return rawText
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function parsePositiveInteger(raw: string): number | null {
  const parsed = Number(raw.trim());
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseNonNegativeInteger(raw: string): number | null {
  const parsed = Number(raw.trim());
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function sumItems(items: Array<{ amount: number }>): number {
  return items.reduce((sum, item) => sum + item.amount, 0);
}

function formatMonthReport(
  monthSheet: string,
  year: number,
  items: Array<{ category: string; amount: number }>
): string {
  const sorted = [...items].sort((a, b) => b.amount - a.amount);
  return [
    `Relatorio de ${monthSheet}/${year}`,
    `Total: ${formatCurrency(sumItems(sorted))}`,
    ...sorted.map((item) => `${item.category}: ${formatCurrency(item.amount)}`)
  ].join("\n");
}

function formatAllMonthsReport(
  reports: Array<{ monthSheet: string; items: Array<{ category: string; amount: number }> }>
): string {
  const lines = reports.map((report) => ({
    month: report.monthSheet,
    total: sumItems(report.items)
  })).filter((item) => item.total !== 0);
  return [
    "Relatorio de todos os meses",
    `Total geral: ${formatCurrency(lines.reduce((sum, item) => sum + item.total, 0))}`,
    ...lines.map((item) => `${item.month}: ${formatCurrency(item.total)}`)
  ].join("\n");
}

function formatCategoriesReport(
  reports: Array<{ monthSheet: string; items: Array<{ category: string; amount: number }> }>
): string {
  const totals = new Map<string, number>();
  for (const report of reports) {
    for (const item of report.items) {
      totals.set(item.category, (totals.get(item.category) ?? 0) + item.amount);
    }
  }

  const lines = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .filter(([, amount]) => amount !== 0);
  return [
    "Categorias em todos os meses",
    `Total geral: ${formatCurrency(lines.reduce((sum, [, amount]) => sum + amount, 0))}`,
    ...lines.map(([category, amount]) => `${category}: ${formatCurrency(amount)}`)
  ].join("\n");
}

function formatSingleCategoryReport(
  category: (typeof categories)[number],
  reports: Array<{ monthSheet: string; items: Array<{ category: string; amount: number }> }>,
  month?: number
): string {
  const display = categoryDisplayNames[category];
  const selectedReports = typeof month === "number"
    ? reports[month]
      ? [reports[month]]
      : []
    : reports;
  const lines = selectedReports.map((report) => ({
    month: report.monthSheet,
    amount: report.items.find((item) => normalizeText(item.category) === normalizeText(display))?.amount ?? 0
  })).filter((item) => item.amount !== 0);

  return [
    `Relatorio de ${display}`,
    `Total: ${formatCurrency(lines.reduce((sum, item) => sum + item.amount, 0))}`,
    ...lines.map((item) => `${item.month}: ${formatCurrency(item.amount)}`)
  ].join("\n");
}

function formatDayReport(date: Date, history: HistoryRow[]): string {
  const iso = formatIsoDate(date);
  const items = history.filter((row) => row.date === iso);
  return formatHistoryReport(`Relatorio do dia ${formatBrazilianDate(date)}`, items);
}

function formatDaysReport(month: number, year: number, history: HistoryRow[]): string {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const totals = new Map<string, number>();
  for (const row of history.filter((item) => item.date.startsWith(prefix))) {
    totals.set(row.date, (totals.get(row.date) ?? 0) + row.amount);
  }

  const lines = [...totals.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const monthName = getMonthSheetName(new Date(year, month, 1));
  return [
    `Relatorio diario de ${monthName}/${year}`,
    `Total: ${formatCurrency(lines.reduce((sum, [, amount]) => sum + amount, 0))}`,
    ...lines.map(([date, amount]) => `${formatDateLabel(date)}: ${formatCurrency(amount)}`)
  ].join("\n");
}

function formatHistoryReport(title: string, rows: HistoryRow[]): string {
  const categoryTotals = new Map<string, number>();
  for (const row of rows) {
    categoryTotals.set(row.category, (categoryTotals.get(row.category) ?? 0) + row.amount);
  }

  const lines = [...categoryTotals.entries()].sort((a, b) => b[1] - a[1]);
  return [
    title,
    `Total: ${formatCurrency(rows.reduce((sum, row) => sum + row.amount, 0))}`,
    ...lines.map(([category, amount]) => `${category}: ${formatCurrency(amount)}`)
  ].join("\n");
}

function formatDateLabel(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

async function readFootballRows(sheets: GoogleSheetsClient, sheetName: string): Promise<FootballRow[]> {
  const rows = await sheets.getValues(`${quoteSheet(sheetName)}!A:G`);
  return rows.slice(1).map((row, index) => ({
    rowIndex: index + 2,
    athlete: row[0] ?? "",
    goals: parsePositiveInteger(row[1] ?? "") ?? 0,
    ownGoals: parsePositiveInteger(row[2] ?? "") ?? 0,
    assists: parsePositiveInteger(row[3] ?? "") ?? 0,
    yellowCards: parsePositiveInteger(row[4] ?? "") ?? 0,
    redCards: parsePositiveInteger(row[5] ?? "") ?? 0,
    games: parsePositiveInteger(row[6] ?? "") ?? 0
  })).filter((row) => row.athlete);
}

function footballRowValues(row: FootballRow): number[] {
  return [row.goals, row.ownGoals, row.assists, row.yellowCards, row.redCards, row.games];
}

function valuesForSingleFootballMetric(metric: FootballMetricName, amount: number): number[] {
  const values = [0, 0, 0, 0, 0, 0];
  values[footballMetricIndex(metric)] = amount;
  return values;
}

function footballMetricIndex(metric: FootballMetricName): number {
  if (metric === "Gols") return 0;
  if (metric === "Gols contra") return 1;
  if (metric === "Assistencias") return 2;
  if (metric === "Cartoes amarelos") return 3;
  if (metric === "Cartoes vermelhos") return 4;
  return 5;
}

function formatFootballUpdateSummary(athlete: (typeof footballAthletes)[number], values: number[]): string {
  const labels = ["gols", "gols contra", "assistencias", "amarelos", "vermelhos", "jogos"];
  const parts = values
    .map((value, index) => value ? `+${value} ${labels[index]}` : null)
    .filter(isString);
  return `${footballAthleteDisplayNames[athlete]}: ${parts.join(", ")}`;
}

function formatFootballReport(kind: FootballReportKind, sheetName: string, rows: FootballRow[]): string {
  const metric = footballReportMetric(kind);
  if (metric) {
    return [
      `Ranking de ${metric.label} - ${sheetName}`,
      ...[...rows].sort((a, b) => b[metric.key] - a[metric.key]).map((row) => `${row.athlete}: ${row[metric.key]}`)
    ].join("\n");
  }

  return [
    `Resumo do futebol - ${sheetName}`,
    `Gols: ${rows.reduce((sum, row) => sum + row.goals, 0)}`,
    `Gols contra: ${rows.reduce((sum, row) => sum + row.ownGoals, 0)}`,
    `Assistencias: ${rows.reduce((sum, row) => sum + row.assists, 0)}`,
    `Cartoes amarelos: ${rows.reduce((sum, row) => sum + row.yellowCards, 0)}`,
    `Cartoes vermelhos: ${rows.reduce((sum, row) => sum + row.redCards, 0)}`,
    `Jogos somados: ${rows.reduce((sum, row) => sum + row.games, 0)}`,
    "",
    "Top gols:",
    ...[...rows].sort((a, b) => b.goals - a.goals).slice(0, 5).map((row) => `${row.athlete}: ${row.goals}`),
    "",
    "Top assistencias:",
    ...[...rows].sort((a, b) => b.assists - a.assists).slice(0, 5).map((row) => `${row.athlete}: ${row.assists}`)
  ].join("\n");
}

function footballReportMetric(kind: FootballReportKind): { key: keyof Pick<FootballRow, "goals" | "ownGoals" | "assists" | "yellowCards" | "redCards" | "games">; label: string } | null {
  if (kind === "gols") return { key: "goals", label: "Gols" };
  if (kind === "gols-contra") return { key: "ownGoals", label: "Gols contra" };
  if (kind === "assistencias") return { key: "assists", label: "Assistencias" };
  if (kind === "amarelos") return { key: "yellowCards", label: "Cartoes amarelos" };
  if (kind === "vermelhos") return { key: "redCards", label: "Cartoes vermelhos" };
  if (kind === "jogos") return { key: "games", label: "Jogos" };
  return null;
}

function invalidCommandMessage(): string {
  return [
    "Nao consegui entender o comando.",
    "Lancamento: fin-darithur / Mercado / 85,90 / arroz / 22/09/2026",
    "Relatorio: fin-darithur / relatorio / mes / 09/2026",
    "Remover: fin-darithur / remover / Mercado / 85,90 / 22/09/2026",
    "Necessidade: fin-darithur / necessidade / Filtro de agua / 22/09/2026",
    "Futebol: agente-bote-certo / gol / Braza / 1"
  ].join("\n");
}
