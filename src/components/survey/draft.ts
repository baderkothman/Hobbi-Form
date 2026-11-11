// Keeps answers through a reload, or a phone discarding a background tab.
// sessionStorage ends with the tab, and contact fields are never written to it,
// so a shared device doesn't keep anyone's details.
import { z } from "zod";

import { isContactQuestion, getQuestion } from "@/survey/config";
import type { Screen } from "@/survey/flow";
import type { SurveyValues } from "@/survey/form";
import type { Answers } from "@/survey/types";

// Bumped whenever questions or pages change, so older drafts are ignored.
const KEY = "hobbi-survey-draft-v3";

/** Personal details left out of the draft: C21 can identify a club or a person. */
function isNeverStored(id: string): boolean {
  if (id === "C21") return true;
  try {
    return isContactQuestion(getQuestion(id));
  } catch {
    return true; // Not a current question: nothing worth keeping.
  }
}

const draftSchema = z.object({
  submissionId: z.uuid(),
  screen: z.discriminatedUnion("name", [
    z.object({ name: z.literal("age") }),
    z.object({ name: z.literal("consent") }),
    z.object({ name: z.literal("audience") }),
    z.object({
      name: z.literal("questions"),
      page: z.number().int().min(0).max(60),
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
      ([id, value]) => !isNeverStored(id) && value !== undefined,
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
