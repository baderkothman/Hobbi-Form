import {
  getQuestion,
  isContactQuestion,
  isQuestionVisible,
  questionsFor,
} from "@/survey/config";
import type { Answers, Audience } from "@/survey/types";

/**
 * A complete, valid set of answers: first option everywhere, no optional text,
 * and every contact opt-in declined. Tests opt in explicitly when they need to.
 */
export function validAnswers(audience: Audience): Answers {
  const answers: Answers = {};
  for (const question of questionsFor(audience)) {
    if (question.type === "mc") answers[question.id] = question.options[0].value;
    if (question.type === "checkbox") {
      answers[question.id] = [question.options[0].value];
    }
    if (question.type === "scale") answers[question.id] = question.min;
  }
  for (const contact of questionsFor(audience).filter(isContactQuestion)) {
    const rule = contact.showIf!;
    const optIn = getQuestion(rule.question);
    if (optIn.type !== "mc") continue;
    answers[optIn.id] = optIn.options.find(
      (option) => !rule.values.includes(option.value),
    )!.value;
  }
  // Leave out questions those answers hide, such as E01a when E01 isn't Tripoli.
  return Object.fromEntries(
    Object.entries(answers).filter(([id]) => isQuestionVisible(id, answers)),
  );
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
