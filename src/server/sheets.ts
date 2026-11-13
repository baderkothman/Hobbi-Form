import { createHmac, randomBytes } from "node:crypto";

import { JWT } from "google-auth-library";

import { SURVEY_VERSION } from "../survey/config";
import { questions } from "../survey/questions.generated";
import type { StoredResponse } from "../survey/schema";

const RESPONSES_TAB = "Responses";
const RATE_LIMITS_TAB = "RateLimits";
const RATE_HEADERS = ["rate_key", "expires_at"];
export const RATE_LIMIT_PER_HOUR = 20;

export const SHEET_HEADERS = [
  "submission_id",
  "created_at",
  "survey_version",
  "audience",
  "locale",
  "respondent_adult",
  "contact_consent",
  "legacy_contact", // Earlier imported responses may have this value.
  ...questions.map((question) => question.id),
];

type SheetConfig = { id: string; email: string; key: string };
type SheetIds = { responses: number; rateLimits: number };
type ValueRange = { values?: string[][] };
type SaveResult = "saved" | "duplicate" | "rate_limited";

export class SheetConfigurationError extends Error {}
export class SheetSyncError extends Error {}

function config(): SheetConfig {
  const id = process.env.GOOGLE_SHEET_ID?.trim();
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!id || !email || !key) {
    throw new SheetConfigurationError("Google Sheet settings are incomplete.");
  }
  if (process.env.NODE_ENV === "production" && !process.env.RATE_LIMIT_SECRET) {
    throw new SheetConfigurationError("RATE_LIMIT_SECRET is not set.");
  }
  return { id, email, key };
}

let auth: { email: string; key: string; client: JWT } | undefined;

async function accessToken(settings: SheetConfig): Promise<string> {
  if (auth?.email !== settings.email || auth.key !== settings.key) {
    auth = {
      email: settings.email,
      key: settings.key,
      client: new JWT({
        email: settings.email,
        key: settings.key,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      }),
    };
  }
  const { token } = await auth.client.getAccessToken();
  if (!token) throw new SheetSyncError("Google access token was empty.");
  return token;
}

function columnName(index: number): string {
  let value = index + 1;
  let name = "";
  while (value > 0) {
    value--;
    name = String.fromCharCode(65 + (value % 26)) + name;
    value = Math.floor(value / 26);
  }
  return name;
}

/** CellData.stringValue keeps text beginning with = as text, not a formula. */
export function sheetValues(response: StoredResponse, createdAt = new Date()): string[] {
  const cell = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    if (Array.isArray(value)) return JSON.stringify(value);
    return String(value);
  };
  const contacts = response.contactConsent ? (response.contacts ?? {}) : {};
  return [
    response.submissionId,
    createdAt.toISOString(),
    SURVEY_VERSION,
    response.audience,
    response.locale,
    cell(response.adult),
    cell(response.contactConsent),
    "",
    ...questions.map((question) => cell(contacts[question.id] ?? response.answers[question.id])),
  ];
}

async function sheetsRequest(
  settings: SheetConfig,
  path: string,
  method: string,
  body?: unknown,
): Promise<unknown> {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(settings.id)}${path}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${await accessToken(settings)}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!response.ok) throw new SheetSyncError(`Google Sheets returned ${response.status}.`);
  return response.json();
}

async function sheetIds(settings: SheetConfig): Promise<SheetIds> {
  const result = (await sheetsRequest(
    settings,
    "?fields=sheets(properties(sheetId,title))",
    "GET",
  )) as { sheets?: { properties: { sheetId: number; title: string } }[] };
  const idFor = (title: string) =>
    result.sheets?.find((sheet) => sheet.properties.title === title)?.properties.sheetId;
  const responses = idFor(RESPONSES_TAB);
  const rateLimits = idFor(RATE_LIMITS_TAB);
  if (responses === undefined || rateLimits === undefined) {
    throw new SheetSyncError("Required Google Sheet tabs are missing.");
  }
  return { responses, rateLimits };
}

type SheetState = { responseIds: string[]; rateRows: string[][] };

async function readState(settings: SheetConfig): Promise<SheetState> {
  const ranges = [
    `${RESPONSES_TAB}!A1:${columnName(SHEET_HEADERS.length - 1)}1`,
    `${RESPONSES_TAB}!A2:A`,
    `${RATE_LIMITS_TAB}!A1:B1`,
    `${RATE_LIMITS_TAB}!A2:B`,
  ];
  const params = new URLSearchParams();
  for (const range of ranges) params.append("ranges", range);
  const result = (await sheetsRequest(
    settings,
    `/values:batchGet?${params.toString()}`,
    "GET",
  )) as { valueRanges?: ValueRange[] };
  const values = result.valueRanges;
  if (
    !values || values.length !== 4 ||
    JSON.stringify(values[0].values?.[0]) !== JSON.stringify(SHEET_HEADERS) ||
    JSON.stringify(values[2].values?.[0]) !== JSON.stringify(RATE_HEADERS)
  ) {
    throw new SheetSyncError("Google Sheet headers do not match this survey.");
  }
  return {
    responseIds: (values[1].values ?? []).map((row) => row[0]).filter(Boolean),
    rateRows: values[3].values ?? [],
  };
}

const fallbackSecret = randomBytes(32);

function rateKey(ip: string, now: Date): string {
  return createHmac("sha256", process.env.RATE_LIMIT_SECRET || fallbackSecret)
    .update(`${ip}|${now.toISOString().slice(0, 13)}`)
    .digest("hex");
}

function expiredRateRanges(rows: string[][], now: Date, sheetId: number) {
  const expired: number[] = [];
  rows.forEach(([key, expiresAt], index) => {
    if (!key && !expiresAt) return;
    const expiry = Date.parse(expiresAt ?? "");
    if (!key || !Number.isFinite(expiry)) {
      throw new SheetSyncError("RateLimits tab contains an invalid row.");
    }
    if (expiry <= now.getTime()) expired.push(index + 1); // zero-based grid row
  });
  const ranges: { repeatCell: { range: object; cell: object; fields: string } }[] = [];
  for (const index of expired) {
    const last = ranges.at(-1)?.repeatCell.range as { endRowIndex?: number } | undefined;
    if (last?.endRowIndex === index) {
      last.endRowIndex = index + 1;
    } else {
      ranges.push({
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: index,
            endRowIndex: index + 1,
            startColumnIndex: 0,
            endColumnIndex: RATE_HEADERS.length,
          },
          cell: {},
          fields: "userEnteredValue",
        },
      });
    }
  }
  return ranges;
}

function rowData(values: string[]) {
  return { values: values.map((value) => ({ userEnteredValue: { stringValue: value } })) };
}

/** The spreadsheet is the only persistent store for responses and rate counters. */
export async function saveResponseToSheet(
  response: StoredResponse,
  ip: string,
  now = new Date(),
): Promise<SaveResult> {
  const settings = config();
  try {
    const ids = await sheetIds(settings);
    const state = await readState(settings);
    if (state.responseIds.includes(response.submissionId)) return "duplicate";

    const key = rateKey(ip, now);
    const currentCount = state.rateRows.filter(
      ([storedKey, expiresAt]) =>
        storedKey === key && Date.parse(expiresAt ?? "") > now.getTime(),
    ).length;
    if (currentCount >= RATE_LIMIT_PER_HOUR) return "rate_limited";

    const requests = [
      ...expiredRateRanges(state.rateRows, now, ids.rateLimits),
      {
        appendCells: {
          sheetId: ids.responses,
          rows: [rowData(sheetValues(response, now))],
          fields: "userEnteredValue",
        },
      },
      {
        // An atomic batch keeps the earliest response when retries overlap.
        deleteDuplicates: {
          range: {
            sheetId: ids.responses,
            startRowIndex: 1,
            startColumnIndex: 0,
            endColumnIndex: SHEET_HEADERS.length,
          },
          comparisonColumns: [{
            sheetId: ids.responses,
            dimension: "COLUMNS",
            startIndex: 0,
            endIndex: 1,
          }],
        },
      },
      {
        appendCells: {
          sheetId: ids.rateLimits,
          rows: [rowData([key, new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString()])],
          fields: "userEnteredValue",
        },
      },
    ];
    await sheetsRequest(settings, ":batchUpdate", "POST", { requests });
    return "saved";
  } catch (error) {
    if (error instanceof SheetConfigurationError || error instanceof SheetSyncError) throw error;
    throw new SheetSyncError("Google Sheet request failed.");
  }
}
