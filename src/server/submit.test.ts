import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { validAnswers, validSubmission } from "@/test/fixtures";

import { SheetConfigurationError, SheetSyncError } from "./sheets";
import { MAX_BODY_BYTES, handleSubmission } from "./submit";

type SaveSheet = NonNullable<Parameters<typeof handleSubmission>[1]>;

beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

function post(
  body: unknown,
  saveSheet: SaveSheet = vi.fn(async () => "saved" as const),
  headers: Record<string, string> = {},
) {
  return handleSubmission(
    new Request("https://survey.example/api/submissions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        host: "survey.example",
        origin: "https://survey.example",
        "x-forwarded-for": "203.0.113.7",
        ...headers,
      },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    saveSheet,
  );
}

describe("submissions", () => {
  it("sends a validated response and network address to Sheets", async () => {
    const saveSheet = vi.fn<SaveSheet>(async () => "saved");
    const submission = validSubmission("explorer", {
      answers: {
        ...validAnswers("explorer"),
        E16: "yes_i_opt_in",
        E17: "person@example.com",
      },
    });
    const response = await post(submission, saveSheet);

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true });
    expect(saveSheet).toHaveBeenCalledOnce();
    expect(saveSheet.mock.calls[0][0]).toMatchObject({
      submissionId: submission.submissionId,
      audience: "explorer",
      contactConsent: true,
      contacts: { E17: "person@example.com" },
    });
    expect(saveSheet.mock.calls[0][0].answers).not.toHaveProperty("E17");
    expect(saveSheet.mock.calls[0][1]).toBe("203.0.113.7");
  });

  it.each([
    ["duplicate", 200, { ok: true }],
    ["rate_limited", 429, { ok: false, code: "rate_limited" }],
  ] as const)("maps %s from Sheets to HTTP %s", async (outcome, status, body) => {
    const response = await post(validSubmission(), async () => outcome);
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual(body);
  });

  it("rejects invalid answers before contacting Sheets", async () => {
    const saveSheet = vi.fn(async () => "saved" as const);
    const response = await post(
      validSubmission("explorer", {
        answers: { ...validAnswers("explorer"), E03: ["not_an_option"] },
      }),
      saveSheet,
    );
    expect(response.status).toBe(400);
    expect((await response.json()).fields).toEqual(["E03"]);
    expect(saveSheet).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON, wrong content type, and cross-site requests", async () => {
    const saveSheet = vi.fn(async () => "saved" as const);
    expect((await post("{", saveSheet)).status).toBe(400);
    expect((await post(validSubmission(), saveSheet, { "content-type": "text/plain" })).status).toBe(415);
    expect((await post(validSubmission(), saveSheet, { origin: "https://evil.example" })).status).toBe(403);
    expect(saveSheet).not.toHaveBeenCalled();
  });

  it("stops reading a body larger than 32 KB", async () => {
    let canceled = false;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) { controller.enqueue(new Uint8Array(MAX_BODY_BYTES + 1)); },
      cancel() { canceled = true; },
    });
    const request = new Request("https://survey.example/api/submissions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: stream,
      duplex: "half",
    } as RequestInit & { duplex: "half" });
    const saveSheet = vi.fn(async () => "saved" as const);
    const response = await handleSubmission(request, saveSheet);
    expect(response.status).toBe(413);
    expect(canceled).toBe(true);
    expect(saveSheet).not.toHaveBeenCalled();
  });

  it("answers success to a filled honeypot without saving", async () => {
    const saveSheet = vi.fn(async () => "saved" as const);
    const response = await post({ ...validSubmission(), website: "https://spam.example" }, saveSheet);
    expect(response.status).toBe(200);
    expect(saveSheet).not.toHaveBeenCalled();
  });

  it.each([SheetConfigurationError, SheetSyncError])(
    "returns 503 without exposing answers on %s",
    async (ErrorClass) => {
      const privateText = "my private thoughts";
      const response = await post(
        validSubmission("explorer", {
          answers: { ...validAnswers("explorer"), E15: privateText },
        }),
        async () => { throw new ErrorClass("Sheets unavailable."); },
      );
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ ok: false, code: "unavailable" });
      const logs = JSON.stringify([
        ...vi.mocked(console.error).mock.calls,
        ...vi.mocked(console.info).mock.calls,
      ]);
      expect(logs).not.toContain(privateText);
    },
  );

  it("does not log opted-in contact details", async () => {
    await post(
      validSubmission("explorer", {
        answers: {
          ...validAnswers("explorer"),
          E16: "yes_i_opt_in",
          E17: "person@example.com",
        },
      }),
    );
    expect(JSON.stringify(vi.mocked(console.info).mock.calls)).not.toContain("person@example.com");
  });
});
