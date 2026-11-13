import { randomUUID } from "node:crypto";

import { JWT } from "google-auth-library";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { StoredResponse } from "../survey/schema";
import {
  RATE_LIMIT_PER_HOUR,
  SHEET_HEADERS,
  SheetConfigurationError,
  SheetSyncError,
  saveResponseToSheet,
  sheetValues,
} from "./sheets";

type BatchRequest = Record<string, unknown>;

function response(submissionId = randomUUID()): StoredResponse {
  return {
    submissionId,
    audience: "explorer",
    locale: "en",
    adult: true,
    answers: { E15: "=1+1", E03: ["music", "art"] },
    contacts: null,
    contactConsent: false,
  };
}

function mockGoogleSheets() {
  vi.stubEnv("GOOGLE_SHEET_ID", "test-sheet-id");
  vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL", "test@example.iam.gserviceaccount.com");
  vi.stubEnv("GOOGLE_PRIVATE_KEY", "fake-key");
  vi.stubEnv("RATE_LIMIT_SECRET", "test-rate-secret");
  vi.spyOn(JWT.prototype, "getAccessToken").mockImplementation(
    () => Promise.resolve({ token: "test-token" }) as never,
  );

  const responses: string[][] = [];
  const rateRows: string[][] = [];
  const batches: BatchRequest[][] = [];
  const fetchMock = vi.fn(async (input: string, init: RequestInit) => {
    const url = new URL(input);
    if (url.pathname.endsWith("/test-sheet-id") && init.method === "GET") {
      return Response.json({ sheets: [
        { properties: { sheetId: 101, title: "Responses" } },
        { properties: { sheetId: 202, title: "RateLimits" } },
      ] });
    }
    if (url.pathname.endsWith("/values:batchGet")) {
      return Response.json({ valueRanges: [
        { values: [SHEET_HEADERS] },
        { values: responses.map((row) => [row[0]]) },
        { values: [["rate_key", "expires_at"]] },
        { values: rateRows },
      ] });
    }
    if (url.pathname.endsWith("/test-sheet-id:batchUpdate")) {
      const body = JSON.parse(init.body as string) as { requests: BatchRequest[] };
      batches.push(body.requests);
      for (const request of body.requests) {
        if (request.repeatCell) {
          const { range } = request.repeatCell as {
            range: { startRowIndex: number; endRowIndex: number };
          };
          for (let index = range.startRowIndex; index < range.endRowIndex; index++) {
            rateRows[index - 1] = [];
          }
        }
        if (request.appendCells) {
          const append = request.appendCells as {
            sheetId: number;
            rows: { values: { userEnteredValue: { stringValue: string } }[] }[];
          };
          const values = append.rows[0].values.map((cell) => cell.userEnteredValue.stringValue);
          (append.sheetId === 101 ? responses : rateRows).push(values);
        }
        if (request.deleteDuplicates) {
          const seen = new Set<string>();
          const unique = responses.filter((row) => {
            if (seen.has(row[0])) return false;
            seen.add(row[0]);
            return true;
          });
          responses.splice(0, responses.length, ...unique);
        }
      }
      return Response.json({ replies: body.requests.map(() => ({})) });
    }
    return Response.json({ error: "Unexpected request" }, { status: 500 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return { responses, rateRows, batches, fetchMock };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Sheet-only storage", () => {
  it("writes responses and hashed rate events in one batch, then recognizes retries", async () => {
    const sheet = mockGoogleSheets();
    const answer = response();
    expect(await saveResponseToSheet(answer, "203.0.113.7")).toBe("saved");
    expect(sheet.responses).toHaveLength(1);
    expect(sheet.responses[0]).toHaveLength(SHEET_HEADERS.length);
    expect(sheet.responses[0]).toContain("=1+1");
    expect(sheet.responses[0]).toContain('["music","art"]');
    expect(sheet.rateRows).toHaveLength(1);
    expect(sheet.rateRows[0][0]).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(sheet.rateRows)).not.toContain("203.0.113.7");
    expect(sheet.batches[0].some((request) => Boolean(request.deleteDuplicates))).toBe(true);

    expect(await saveResponseToSheet(answer, "203.0.113.7")).toBe("duplicate");
    expect(sheet.responses).toHaveLength(1);
    expect(sheet.rateRows).toHaveLength(1);
    expect(sheet.batches).toHaveLength(1);
  });

  it("keeps opted-in contacts only and writes free text as string values", async () => {
    const sheet = mockGoogleSheets();
    const answer = response();
    answer.answers.E15 = "=SUM(A1:A2)";
    answer.contacts = { E17: "person@example.com" };
    answer.contactConsent = true;
    await saveResponseToSheet(answer, "203.0.113.7");
    expect(sheet.responses[0]).toContain("person@example.com");
    expect(sheet.responses[0]).toContain("=SUM(A1:A2)");
    const append = sheet.batches[0].find((request) =>
      (request.appendCells as { sheetId?: number } | undefined)?.sheetId === 101,
    )?.appendCells as { rows: { values: { userEnteredValue: object }[] }[] };
    expect(append.rows[0].values.every((cell) => "stringValue" in cell.userEnteredValue)).toBe(true);

    answer.contactConsent = false;
    expect(sheetValues(answer)).not.toContain("person@example.com");
  });

  it("limits a network to 20 submissions per hour without a database", async () => {
    const sheet = mockGoogleSheets();
    const now = new Date("2026-11-13T10:00:00Z");
    for (let index = 0; index < RATE_LIMIT_PER_HOUR; index++) {
      expect(await saveResponseToSheet(response(), "203.0.113.7", now)).toBe("saved");
    }
    expect(await saveResponseToSheet(response(), "203.0.113.7", now)).toBe("rate_limited");
    expect(sheet.responses).toHaveLength(RATE_LIMIT_PER_HOUR);
    expect(await saveResponseToSheet(response(), "198.51.100.9", now)).toBe("saved");
  });

  it("clears expired rate events while saving a new response", async () => {
    const sheet = mockGoogleSheets();
    sheet.rateRows.push(["old-hash", "2026-11-13T08:00:00Z"]);
    await saveResponseToSheet(response(), "203.0.113.7", new Date("2026-11-13T10:00:00Z"));
    expect(sheet.rateRows[0]).toEqual([]);
    expect(sheet.batches[0][0]).toHaveProperty("repeatCell");
  });

  it("refuses missing credentials and mismatched headers", async () => {
    await expect(saveResponseToSheet(response(), "203.0.113.7"))
      .rejects.toBeInstanceOf(SheetConfigurationError);
    const sheet = mockGoogleSheets();
    sheet.fetchMock.mockImplementationOnce(async () => Response.json({ sheets: [
      { properties: { sheetId: 101, title: "Responses" } },
      { properties: { sheetId: 202, title: "RateLimits" } },
    ] }));
    sheet.fetchMock.mockImplementationOnce(async () => Response.json({ valueRanges: [
      { values: [["wrong"]] }, { values: [] },
      { values: [["rate_key", "expires_at"]] }, { values: [] },
    ] }));
    await expect(saveResponseToSheet(response(), "203.0.113.7"))
      .rejects.toBeInstanceOf(SheetSyncError);
  });
});
