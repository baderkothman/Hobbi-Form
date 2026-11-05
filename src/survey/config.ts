// Survey behaviour that the CSV does not describe: how questions are grouped
// into steps, which contact fields depend on an opt-in, and text limits.
import { questions } from "./questions.generated";
import type { Answers, Audience, Localized, Question } from "./types";

/** Bump when questions change, so responses stay attributable to a wording. */
export const SURVEY_VERSION = "2026-11-v1";

export type SurveyStep = {
  id: string;
  title: Localized;
  questionIds: readonly string[];
};

export const stepsByAudience: Record<Audience, readonly SurveyStep[]> = {
  explorer: [
    {
      id: "explorer-activities",
      title: { en: "Your activities", ar: "أنشطتك" },
      questionIds: ["E01", "E02", "E03"],
    },
    {
      id: "explorer-preferences",
      title: { en: "What you look for", ar: "ما الذي تبحث عنه" },
      questionIds: ["E04", "E05", "E06", "E07"],
    },
    {
      id: "explorer-joining",
      title: { en: "How you like to join", ar: "كيف تحب أن تشارك" },
      questionIds: ["E08", "E09", "E10", "E11"],
    },
    {
      id: "explorer-app",
      title: { en: "An app like Hobbi", ar: "تطبيق مثل Hobbi" },
      questionIds: ["E12", "E13", "E14", "E15"],
    },
    {
      id: "explorer-contact",
      title: { en: "Staying in touch", ar: "البقاء على تواصل" },
      questionIds: ["E16", "E17"],
    },
  ],
  club: [
    {
      id: "club-profile",
      title: { en: "Your club", ar: "ناديكم" },
      questionIds: ["C01", "C02", "C03", "C04"],
    },
    {
      id: "club-operations",
      title: { en: "Promotion and bookings", ar: "الترويج والحجوزات" },
      questionIds: ["C05", "C06", "C07", "C08", "C09"],
    },
    {
      id: "club-tools",
      title: { en: "Tools and features", ar: "الأدوات والميزات" },
      questionIds: ["C10", "C11", "C12", "C13", "C14"],
    },
    {
      id: "club-pricing",
      title: { en: "Pricing and decisions", ar: "الأسعار والقرارات" },
      questionIds: ["C15", "C16", "C17", "C18", "C19"],
    },
    {
      id: "club-final",
      title: { en: "Final thoughts", ar: "أفكار أخيرة" },
      questionIds: ["C20", "C21", "C22", "C23"],
    },
  ],
};

export type ContactFormat = "email" | "instagram" | "phone";

/**
 * Contact questions are shown, validated and stored only after an opt-in. They
 * are stored apart from the answers so research exports carry no contact data.
 */
export const contactRules: Record<
  string,
  { optInQuestion: string; optInValue: string; formats: ContactFormat[] }
> = {
  E17: {
    optInQuestion: "E16",
    optInValue: "yes_i_opt_in",
    formats: ["email", "instagram"],
  },
  C23: {
    optInQuestion: "C22",
    optInValue: "yes_i_opt_in",
    formats: ["email", "phone"],
  },
};

export const MAX_PARAGRAPH_LENGTH = 1000;
export const MAX_TEXT_LENGTH = 120;

const byId = new Map(questions.map((question) => [question.id, question]));

export function getQuestion(id: string): Question {
  const question = byId.get(id);
  if (!question) throw new Error(`Unknown survey question: ${id}`);
  return question;
}

export function questionsFor(audience: Audience): Question[] {
  return stepsByAudience[audience].flatMap((step) =>
    step.questionIds.map(getQuestion),
  );
}

export function isQuestionVisible(id: string, answers: Answers): boolean {
  const rule = contactRules[id];
  return !rule || answers[rule.optInQuestion] === rule.optInValue;
}

export function visibleQuestions(
  step: SurveyStep,
  answers: Answers,
): Question[] {
  return step.questionIds
    .filter((id) => isQuestionVisible(id, answers))
    .map(getQuestion);
}

export function contactQuestionFor(audience: Audience): string {
  const id = questionsFor(audience).find((q) => contactRules[q.id])?.id;
  if (!id) throw new Error(`No contact question for ${audience}`);
  return id;
}
