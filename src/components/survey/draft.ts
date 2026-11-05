// Keeps answers through a reload, or a phone discarding a background tab.
// sessionStorage ends with the tab, and contact fields are never written to it,
// so a shared device doesn't keep anyone's details.
import { z } from "zod";

import { contactRules } from "@/survey/config";
import type { Screen } from "@/survey/flow";
import type { SurveyValues } from "@/survey/form";
import type { Answers } from "@/survey/types";

const KEY = "hobbi-survey-draft-v1";

/** Personal details left out of the draft: C21 can identify a club or a person. */
const NEVER_STORED = new Set([...Object.keys(contactRules), "C21"]);

const draftSchema = z.object({
  submissionId: z.uuid(),
  screen: z.discriminatedUnion("name", [
    z.object({ name: z.literal("screening") }),
    z.object({ name: z.literal("audience") }),
    z.object({
      name: z.literal("questions"),
      step: z.number().int().min(0).max(4),
    }),
    z.object({ name: z.literal("review") }),
  ]),
  adult: z.enum(["yes", "no"]).optional(),
  consent: z.enum(["yes", "no"]).optional(),
  audience: z.enum(["explorer", "club"]).optional(),
  answers: z.record(
    z.string(),
    z.union([z.string(), z.array(z.string()), z.number()]),
  ),
});

export type Draft = {
  submissionId: string;
  screen: Screen;
  values: SurveyValues;
};

export function loadDraft(): Draft | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const { submissionId, screen, answers, ...rest } = draftSchema.parse(
      JSON.parse(raw),
    );
    return {
      submissionId,
      screen,
      values: { ...rest, answers: answers as Answers, company_website: "" },
    };
  } catch {
    return null;
  }
}

export function saveDraft(draft: Draft): void {
  const { adult, consent, audience, answers } = draft.values;
  const storable = Object.fromEntries(
    Object.entries(answers).filter(
      ([id, value]) => !NEVER_STORED.has(id) && value !== undefined,
    ),
  );
  try {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({
        submissionId: draft.submissionId,
        screen: draft.screen,
        adult,
        consent,
        audience,
        answers: storable,
      }),
    );
  } catch {
    // Private browsing or a full quota. The survey still works without a draft.
  }
}

export function clearDraft(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}
