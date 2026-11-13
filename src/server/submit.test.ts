// Runs against embedded Postgres, so the SQL and constraints here are the real ones.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { validAnswers, validSubmission } from "@/test/fixtures";

import { createEmbeddedDb, DatabaseNotConfiguredError } from "./db";
import type { SqlRunner } from "./migrations";
import { RATE_LIMIT_PER_HOUR, isRateLimited } from "./store";
import { MAX_BODY_BYTES, handleSubmission } from "./submit";

let db: SqlRunner;

beforeAll(async () => {
  db = await createEmbeddedDb();
});

beforeEach(async () => {
  await db.exec("DELETE FROM responses; DELETE FROM rate_limits;");
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

function post(body: unknown, headers: Record<string, string> = {}) {
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
    async () => db,
  );
}

async function storedResponses() {
  const { rows } = await db.query("SELECT * FROM responses");
  return rows as {
    submission_id: string;
    audience: string;
    locale: string;
    survey_version: string;
    answers: Record<string, unknown>;
    contacts: Record<string, string> | null;
    contact_consent: boolean;
  }[];
}

describe("saving a response", () => {
  it.each(["explorer", "club"] as const)("stores a valid %s response", async (audience) => {
    const submission = validSubmission(audience, { locale: "ar" });
    const response = await post(submission);

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true });

    const [row] = await storedResponses();
    expect(row.submission_id).toBe(submission.submissionId);
    expect(row.audience).toBe(audience);
    expect(row.locale).toBe("ar");
    expect(row.survey_version).toBeTruthy();
    expect(row.answers).toEqual(submission.answers);
    expect(row.contacts).toBeNull();
    expect(row.contact_consent).toBe(false);
  });

  it("saves once when a retry repeats the same submission", async () => {
    const submission = validSubmission();
    expect((await post(submission)).status).toBe(201);

    const retry = await post(submission);
    expect(retry.status).toBe(200);
    expect(await retry.json()).toEqual({ ok: true });
    expect(await storedResponses()).toHaveLength(1);
  });

  it("can't overwrite a saved response by reusing its id", async () => {
    const submission = validSubmission();
    await post(submission);
    await post({
      ...submission,
      answers: { ...submission.answers, E01: "tripoli" },
    });
    const [row] = await storedResponses();
    expect(row.answers.E01).toBe(submission.answers.E01);
  });
});

describe("embedded storage on disk", () => {
  it("creates missing directories and keeps responses across a restart", async () => {
    const root = mkdtempSync(join(tmpdir(), "hobbi-db-"));
    try {
      const path = join(root, "nested", "pglite");
      const first = await createEmbeddedDb(path);
      const submission = validSubmission();
      const response = await handleSubmission(
        new Request("https://survey.example/api/submissions", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(submission),
        }),
        async () => first,
      );
      expect(response.status).toBe(201);
      await first.close?.();

      const reopened = await createEmbeddedDb(path);
      const { rows } = await reopened.query(
        "SELECT submission_id FROM responses",
      );
      expect(rows).toEqual([{ submission_id: submission.submissionId }]);
      await reopened.close?.();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("contact details", () => {
  const withContact = (optIn: string) =>
    validSubmission("explorer", {
      answers: {
        ...validAnswers("explorer"),
        E16: optIn,
        E17: "person@example.com",
      },
    });

  it("stores them, outside the answers, after an opt-in", async () => {
    await post(withContact("yes_i_opt_in"));
    const [row] = await storedResponses();
    expect(row.contacts).toEqual({ E17: "person@example.com" });
    expect(row.contact_consent).toBe(true);
    expect(row.answers).not.toHaveProperty("E17");
  });

  it("never stores them without an opt-in, even if a client sends them", async () => {
    expect((await post(withContact("no"))).status).toBe(201);
    const [row] = await storedResponses();
    expect(row.contacts).toBeNull();
    expect(JSON.stringify(row)).not.toContain("person@example.com");
  });

  it("is backed by a database constraint", async () => {
    await expect(
      db.query(
        `INSERT INTO responses (submission_id, audience, locale, survey_version, answers, contact, contact_consent)
         VALUES ($1, 'explorer', 'en', 'test', '{}', 'person@example.com', false)`,
        [crypto.randomUUID()],
      ),
    ).rejects.toThrow(/contact_requires_consent/);
    await expect(
      db.query(
        `INSERT INTO responses (submission_id, audience, locale, survey_version, answers, contacts, contact_consent)
         VALUES ($1, 'explorer', 'en', 'test', '{}', '{"E22": "+961 3 123 456"}', false)`,
        [crypto.randomUUID()],
      ),
    ).rejects.toThrow(/contacts_require_consent/);
  });

  it("records under-18s, and refuses a club response from one", async () => {
    const minor = { screening: { adult: false, consent: true } };
    expect((await post(validSubmission("explorer", minor))).status).toBe(201);
    const [row] = (await db.query("SELECT respondent_adult FROM responses")).rows;
    expect(row).toEqual({ respondent_adult: false });

    expect((await post(validSubmission("club", minor))).status).toBe(400);
    await expect(
      db.query(
        `INSERT INTO responses (submission_id, audience, locale, survey_version, answers, respondent_adult)
         VALUES ($1, 'club', 'en', 'test', '{}', false)`,
        [crypto.randomUUID()],
      ),
    ).rejects.toThrow(/clubs_are_adults/);
  });

  it("stores the survey version with each response", async () => {
    await post(validSubmission());
    const { rows } = await db.query("SELECT survey_version FROM responses");
    expect(rows).toEqual([{ survey_version: "2026-11-v2" }]);
  });
});

describe("rejecting bad submissions", () => {
  async function expectRejected(response: Response, status: number, code: string) {
    expect(response.status).toBe(status);
    expect(await response.json()).toMatchObject({ ok: false, code });
    expect(await storedResponses()).toHaveLength(0);
  }

  it("rejects a missing consent", async () => {
    await expectRejected(
      await post(
        validSubmission("explorer", {
          screening: { adult: true, consent: false },
        }),
      ),
      400,
      "malformed",
    );
  });

  it("names the invalid fields", async () => {
    const response = await post(
      validSubmission("explorer", {
        answers: { ...validAnswers("explorer"), E03: ["a", "b", "c", "d"] },
      }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      code: "invalid",
      fields: ["E03"],
    });
  });

  it("rejects malformed JSON and the wrong shape", async () => {
    await expectRejected(await post("{not json"), 400, "malformed");
    await expectRejected(await post([1, 2, 3]), 400, "malformed");
    await expectRejected(await post(null), 400, "malformed");
    await expectRejected(
      await post(validSubmission("explorer", { submissionId: "abc" })),
      400,
      "malformed",
    );
    await expectRejected(
      await post(validSubmission("explorer", { audience: "admin" })),
      400,
      "malformed",
    );
  });

  it("rejects other content types", async () => {
    await expectRejected(
      await post(validSubmission(), { "content-type": "text/plain" }),
      415,
      "unsupported_media_type",
    );
  });

  it("rejects oversized bodies", async () => {
    await expectRejected(
      await post(
        validSubmission("explorer", {
          answers: { E15: "x".repeat(MAX_BODY_BYTES) },
        }),
      ),
      413,
      "too_large",
    );
  });

  it("stops reading an oversized streamed body without a content length", async () => {
    let canceled = false;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(MAX_BODY_BYTES + 1));
      },
      cancel() {
        canceled = true;
      },
    });
    const request = new Request("https://survey.example/api/submissions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      duplex: "half",
    } as RequestInit & { duplex: "half" });

    await expectRejected(await handleSubmission(request, async () => db), 413, "too_large");
    expect(canceled).toBe(true);
  });

  it("rejects cross-site requests", async () => {
    await expectRejected(
      await post(validSubmission(), { origin: "https://evil.example" }),
      403,
      "forbidden",
    );
  });

  it("treats SQL in an answer as plain data", async () => {
    const attack = "'); DROP TABLE responses; --";
    const response = await post(
      validSubmission("explorer", {
        answers: { ...validAnswers("explorer"), E15: attack },
      }),
    );
    expect(response.status).toBe(201);
    const [row] = await storedResponses();
    expect(row.answers.E15).toBe(attack);
  });
});

describe("abuse protection", () => {
  it("reports success to a bot that fills the honeypot, and saves nothing", async () => {
    const response = await post({ ...validSubmission(), website: "http://spam" });
    expect(response.status).toBe(200);
    expect(await storedResponses()).toHaveLength(0);
  });

  it("limits submissions per network per hour", async () => {
    for (let i = 0; i < RATE_LIMIT_PER_HOUR; i += 1) {
      expect((await post(validSubmission())).status).toBe(201);
    }
    const blocked = await post(validSubmission());
    expect(blocked.status).toBe(429);
    expect(await storedResponses()).toHaveLength(RATE_LIMIT_PER_HOUR);

    const otherNetwork = await post(validSubmission(), {
      "x-forwarded-for": "198.51.100.9",
    });
    expect(otherNetwork.status).toBe(201);
  });

  it("does not count invalid answers against the shared network limit", async () => {
    const invalid = validSubmission("explorer", {
      answers: { ...validAnswers("explorer"), E03: ["not_an_option"] },
    });
    for (let i = 0; i < RATE_LIMIT_PER_HOUR + 1; i += 1) {
      expect((await post(invalid)).status).toBe(400);
    }
    expect((await post(validSubmission())).status).toBe(201);
    const { rows } = await db.query("SELECT count FROM rate_limits");
    expect(rows).toEqual([{ count: 1 }]);
  });

  it("confirms a saved retry after the network reaches its limit", async () => {
    const first = validSubmission();
    expect((await post(first)).status).toBe(201);
    for (let i = 1; i < RATE_LIMIT_PER_HOUR; i += 1) {
      expect((await post(validSubmission())).status).toBe(201);
    }
    expect((await post(first)).status).toBe(200);
    expect((await post(validSubmission())).status).toBe(429);
    expect(await storedResponses()).toHaveLength(RATE_LIMIT_PER_HOUR);
  });

  it("starts a fresh count each hour and stores no raw IP", async () => {
    const hour = new Date("2026-11-05T10:00:00Z");
    const next = new Date("2026-11-05T11:00:00Z");
    for (let i = 0; i < RATE_LIMIT_PER_HOUR; i += 1) {
      await isRateLimited(db, "203.0.113.50", hour);
    }
    expect(await isRateLimited(db, "203.0.113.50", hour)).toBe(true);
    expect(await isRateLimited(db, "203.0.113.50", next)).toBe(false);

    const { rows } = await db.query("SELECT key FROM rate_limits");
    expect(JSON.stringify(rows)).not.toContain("203.0.113.50");
  });
});

describe("failures", () => {
  const contactSubmission = () =>
    validSubmission("explorer", {
      answers: {
        ...validAnswers("explorer"),
        E16: "yes_i_opt_in",
        E17: "person@example.com",
        E15: "my private thoughts",
      },
    });

  it("returns a generic error when storage fails, and logs no answers", async () => {
    const failing: SqlRunner = {
      query: async () => {
        throw new Error("insert failed for person@example.com");
      },
      exec: async () => {},
    };
    const response = await handleSubmission(
      new Request("https://survey.example/api/submissions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(contactSubmission()),
      }),
      async () => failing,
    );

    expect(response.status).toBe(500);
    const body = await response.text();
    expect(body).toContain("server_error");
    expect(body).not.toContain("person@example.com");

    const logged = JSON.stringify([
      ...vi.mocked(console.error).mock.calls,
      ...vi.mocked(console.info).mock.calls,
    ]);
    expect(logged).not.toContain("person@example.com");
    expect(logged).not.toContain("private thoughts");
  });

  it("logs outcomes without content on success", async () => {
    await post(contactSubmission());
    const logged = JSON.stringify(vi.mocked(console.info).mock.calls);
    expect(logged).toContain('\\"outcome\\":\\"saved\\"');
    expect(logged).not.toContain("person@example.com");
    expect(logged).not.toContain("private thoughts");
  });

  it("answers 503 when production storage isn't configured", async () => {
    const response = await handleSubmission(
      new Request("https://survey.example/api/submissions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validSubmission()),
      }),
      async () => {
        throw new DatabaseNotConfiguredError("missing");
      },
    );
    expect(response.status).toBe(503);
  });

  it("refuses to run in production without a rate-limit secret", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RATE_LIMIT_SECRET", "");
    expect((await post(validSubmission())).status).toBe(503);
    expect(await storedResponses()).toHaveLength(0);
  });
});
