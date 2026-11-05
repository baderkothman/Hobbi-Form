import { createHmac, randomBytes } from "node:crypto";

import { SURVEY_VERSION } from "@/survey/config";
import type { StoredResponse } from "@/survey/schema";

import type { SqlRunner } from "./migrations";

/** Returns false if this submission was already saved (a retry after a lost reply). */
export async function saveResponse(
  db: SqlRunner,
  response: StoredResponse,
): Promise<boolean> {
  const result = await db.query(
    `INSERT INTO responses
       (submission_id, audience, locale, survey_version, answers, contact, contact_consent)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (submission_id) DO NOTHING`,
    [
      response.submissionId,
      response.audience,
      response.locale,
      SURVEY_VERSION,
      JSON.stringify(response.answers),
      response.contact,
      response.contactConsent,
    ],
  );
  return result.rowCount === 1;
}

export const RATE_LIMIT_PER_HOUR = 20;

// A fallback key is fine for development; submit.ts requires a real one in production.
const fallbackSecret = randomBytes(32);

function rateLimitKey(ip: string, now: Date): string {
  const hour = now.toISOString().slice(0, 13);
  return createHmac("sha256", process.env.RATE_LIMIT_SECRET || fallbackSecret)
    .update(`${ip}|${hour}`)
    .digest("hex");
}

/**
 * Counts in the database because serverless instances share no memory. Only a
 * keyed hash is stored, so the table cannot be reversed into IP addresses.
 * Set generously: whole campuses and carriers in Lebanon can share one IP.
 */
export async function isRateLimited(
  db: SqlRunner,
  ip: string,
  now = new Date(),
): Promise<boolean> {
  const { rows } = await db.query(
    `INSERT INTO rate_limits (key, count, expires_at)
     VALUES ($1, 1, $2)
     ON CONFLICT (key) DO UPDATE SET count = rate_limits.count + 1
     RETURNING count`,
    [rateLimitKey(ip, now), new Date(now.getTime() + 2 * 60 * 60 * 1000)],
  );

  // Occasional cleanup keeps the table small without a scheduled job.
  if (Math.random() < 0.02) {
    await db.query("DELETE FROM rate_limits WHERE expires_at < $1", [now]);
  }
  return (rows[0] as { count: number }).count > RATE_LIMIT_PER_HOUR;
}
