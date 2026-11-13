// Handles POST /api/submissions. Nothing from the browser is trusted: the route
// runs the shared validation again, and the checks run cheapest first.
import { randomUUID } from "node:crypto";

import { submissionSchema, validateSubmission } from "@/survey/schema";
import type { StoredResponse } from "@/survey/schema";

import { SheetConfigurationError, SheetSyncError, saveResponseToSheet } from "./sheets";

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
  if (!request.body) return "";

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) return text + decoder.decode();
    bytes += value.byteLength;
    if (bytes > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    text += decoder.decode(value, { stream: true });
  }
}

export async function handleSubmission(
  request: Request,
  saveSheet: (response: StoredResponse, ip: string) => Promise<"saved" | "duplicate" | "rate_limited"> = saveResponseToSheet,
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

    const outcome = await saveSheet(result.response, clientIp(request));
    if (outcome === "rate_limited") {
      return finish("rate_limited", fail(429, "rate_limited"), audience);
    }
    return finish(
      outcome,
      reply(outcome === "saved" ? 201 : 200, { ok: true }),
      audience,
    );
  } catch (error) {
    if (error instanceof SheetConfigurationError) {
      console.error(JSON.stringify({ event: "survey.config_error", requestId, message: error.message }));
      return finish("unavailable", fail(503, "unavailable"));
    }
    if (error instanceof SheetSyncError) {
      console.error(JSON.stringify({ event: "survey.sheet_sync_error", requestId, message: error.message }));
      return finish("sheet_unavailable", fail(503, "unavailable"));
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
