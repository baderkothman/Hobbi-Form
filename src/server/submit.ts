// Handles POST /api/submissions. Nothing from the browser is trusted: the route
// runs the shared validation again, and the checks run cheapest first.
import { randomUUID } from "node:crypto";

import { submissionSchema, validateSubmission } from "@/survey/schema";

import { DatabaseNotConfiguredError } from "./db";
import type { SqlRunner } from "./migrations";
import { isRateLimited, saveResponse } from "./store";

export const MAX_BODY_BYTES = 32 * 1024;

export type SubmitCode =
  | "forbidden"
  | "unsupported_media_type"
  | "too_large"
  | "malformed"
  | "invalid"
  | "rate_limited"
  | "unavailable"
  | "server_error";

function reply(status: number, body: Record<string, unknown>, headers?: HeadersInit) {
  return Response.json(body, { status, headers });
}

function fail(status: number, code: SubmitCode, extra?: Record<string, unknown>) {
  return reply(status, { ok: false, code, ...extra });
}

function log(fields: Record<string, unknown>) {
  // Outcomes only. Answers and contact details are never logged.
  console.info(JSON.stringify({ event: "survey.submit", ...fields }));
}

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // Not a browser; the remaining checks still apply.
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

async function readBody(request: Request): Promise<string | null> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return null;
  const text = await request.text();
  return new TextEncoder().encode(text).length > MAX_BODY_BYTES ? null : text;
}

export async function handleSubmission(
  request: Request,
  getDb: () => Promise<SqlRunner>,
): Promise<Response> {
  const requestId = randomUUID();
  const startedAt = Date.now();
  const finish = (outcome: string, response: Response, audience?: string) => {
    log({ requestId, outcome, audience, ms: Date.now() - startedAt });
    return response;
  };

  if (!isSameOrigin(request)) {
    return finish("forbidden", fail(403, "forbidden"));
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return finish("bad_content_type", fail(415, "unsupported_media_type"));
  }

  const text = await readBody(request);
  if (text === null) return finish("too_large", fail(413, "too_large"));

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return finish("malformed", fail(400, "malformed"));
  }

  // People never see this field, so filling it marks a bot. Reporting success
  // gives the bot no signal to adapt to; nothing is saved.
  if ((body as { website?: unknown } | null)?.website) {
    return finish("honeypot", reply(200, { ok: true }));
  }

  try {
    if (process.env.NODE_ENV === "production" && !process.env.RATE_LIMIT_SECRET) {
      throw new DatabaseNotConfiguredError("RATE_LIMIT_SECRET is not set.");
    }
    const db = await getDb();

    if (await isRateLimited(db, clientIp(request))) {
      return finish("rate_limited", fail(429, "rate_limited"));
    }

    const envelope = submissionSchema.safeParse(body);
    if (!envelope.success) return finish("malformed", fail(400, "malformed"));

    const { audience } = envelope.data;
    const result = validateSubmission(envelope.data);
    if (!result.success) {
      return finish(
        "invalid",
        fail(400, "invalid", { fields: result.fields }),
        audience,
      );
    }

    const created = await saveResponse(db, result.response);
    return finish(
      created ? "saved" : "duplicate",
      reply(created ? 201 : 200, { ok: true }),
      audience,
    );
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      console.error(JSON.stringify({ event: "survey.config_error", requestId, message: error.message }));
      return finish("unavailable", fail(503, "unavailable"));
    }
    // Driver messages can quote parameters, so only the type and code are logged.
    console.error(
      JSON.stringify({
        event: "survey.submit_error",
        requestId,
        type: error instanceof Error ? error.name : "unknown",
        code: (error as { code?: unknown } | null)?.code,
      }),
    );
    return finish("error", fail(500, "server_error"));
  }
}
