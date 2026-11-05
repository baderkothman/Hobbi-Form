import { contactRules, questionsFor } from "@/survey/config";
import type { Answers, Audience } from "@/survey/types";

/** A complete, valid set of answers: first option everywhere, no optional text. */
export function validAnswers(audience: Audience): Answers {
  const answers: Answers = {};
  for (const question of questionsFor(audience)) {
    if (question.type === "mc") answers[question.id] = question.options[0].value;
    if (question.type === "checkbox") {
      answers[question.id] = [question.options[0].value];
    }
    if (question.type === "scale") answers[question.id] = question.min;
  }
  // First option on the opt-in is "yes"; tests opt in explicitly when they need it.
  for (const rule of Object.values(contactRules)) {
    if (rule.optInQuestion in answers) answers[rule.optInQuestion] = "no";
  }
  return answers;
}

export function validSubmission(
  audience: Audience = "explorer",
  overrides: Record<string, unknown> = {},
) {
  return {
    submissionId: crypto.randomUUID(),
    locale: "en",
    screening: { adult: true, consent: true },
    audience,
    answers: validAnswers(audience),
    ...overrides,
  };
}
