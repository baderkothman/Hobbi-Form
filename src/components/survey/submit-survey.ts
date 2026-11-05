import { answersForSubmission } from "@/survey/schema";
import type { SurveyValues } from "@/survey/form";
import type { Audience, Locale } from "@/survey/types";

export type SubmitFailure = "network" | "rateLimited" | "server" | "invalid";

export type SubmitResult =
  | { ok: true }
  | { ok: false; failure: SubmitFailure; fields?: string[] };

const TIMEOUT_MS = 15_000;

/** The same submissionId on a retry means the server can't save a response twice. */
export async function submitSurvey(
  values: SurveyValues,
  audience: Audience,
  locale: Locale,
  submissionId: string,
): Promise<SubmitResult> {
  let response: Response;
  try {
    response = await fetch("/api/submissions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({
        submissionId,
        locale,
        audience,
        screening: {
          adult: values.adult === "yes",
          consent: values.consent === "yes",
        },
        answers: answersForSubmission(audience, values.answers),
        website: values.company_website || undefined,
      }),
    });
  } catch {
    return { ok: false, failure: "network" };
  }

  if (response.ok) return { ok: true };
  if (response.status === 429) return { ok: false, failure: "rateLimited" };
  if (response.status === 400) {
    const body = (await response.json().catch(() => ({}))) as {
      fields?: string[];
    };
    return { ok: false, failure: "invalid", fields: body.fields ?? [] };
  }
  return { ok: false, failure: "server" };
}
