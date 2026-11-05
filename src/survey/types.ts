export const LOCALES = ["en", "ar"] as const;
export type Locale = (typeof LOCALES)[number];

export const AUDIENCES = ["explorer", "club"] as const;
export type Audience = (typeof AUDIENCES)[number];

export type Localized = Record<Locale, string>;

export type QuestionOption = {
  /** Language-independent value stored with the response. */
  value: string;
  label: Localized;
};

type QuestionBase = {
  id: string;
  audience: string;
  prompt: Localized;
  required: boolean;
};

export type ChoiceQuestion = QuestionBase & {
  type: "mc";
  options: QuestionOption[];
};

export type MultiChoiceQuestion = QuestionBase & {
  type: "checkbox";
  options: QuestionOption[];
  maxSelections?: number;
};

export type ScaleQuestion = QuestionBase & {
  type: "scale";
  min: number;
  max: number;
  minLabel: Localized;
  maxLabel: Localized;
};

export type TextQuestion = QuestionBase & {
  type: "paragraph" | "text";
};

export type Question =
  | ChoiceQuestion
  | MultiChoiceQuestion
  | ScaleQuestion
  | TextQuestion;

export type AnswerValue = string | string[] | number | undefined;
export type Answers = Record<string, AnswerValue>;

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "ar";
}

export function directionFor(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}
