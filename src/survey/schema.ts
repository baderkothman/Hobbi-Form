// Validation shared by the browser (for inline errors) and the server (for
// enforcement). Issue messages are codes; the UI translates them.
import { z } from "zod";

import {
  contactQuestionIds,
  isShownTo,
  MAX_COUNT,
  MAX_PARAGRAPH_LENGTH,
  MAX_TEXT_LENGTH,
  questionsFor,
} from "./config";
import type { Answers, Audience, Question, TextQuestion } from "./types";

export const ERROR_CODES = {
  required: "required",
  tooMany: "too_many",
  tooLong: "too_long",
  contactInvalid: "contact_invalid",
  notNumber: "not_number",
} as const;
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// The same patterns as the Google Form, so both channels accept the same answers.
// Phone numbers allow Arabic-Indic digits, which Lebanese keyboards can produce.
const PHONE = /^\+?[0-9٠-٩ ()-]{7,20}$/;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const CONTACT_FORMATS: Record<
  NonNullable<TextQuestion["validation"]>,
  (value: string) => boolean
> = {
  phone: (value) => PHONE.test(value),
  phoneOrEmail: (value) => PHONE.test(value) || EMAIL.test(value),
};

// Newlines and tabs stay; other control characters have no place in an answer.
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

function cleanText(value: unknown): unknown {
  return typeof value === "string"
    ? value.replace(CONTROL_CHARACTERS, "").trim()
    : value;
}

function textSchema(question: TextQuestion, maxLength: number) {
  const isValid = question.validation && CONTACT_FORMATS[question.validation];
  return z.preprocess(
    cleanText,
    z
      .string()
      .max(maxLength, ERROR_CODES.tooLong)
      .refine(
        (value) => !isValid || value === "" || isValid(value),
        ERROR_CODES.contactInvalid,
      )
      .optional(),
  );
}

// Typed counts arrive as strings: whole numbers become numbers, anything else fails.
function countSchema() {
  return z.preprocess(
    (value) => {
      if (typeof value !== "string") return value;
      const trimmed = value.trim();
      if (trimmed === "") return undefined;
      return /^\d+$/.test(trimmed) ? Number(trimmed) : trimmed;
    },
    z
      .number({ error: ERROR_CODES.notNumber })
      .int(ERROR_CODES.notNumber)
      .min(0, ERROR_CODES.notNumber)
      .max(MAX_COUNT, ERROR_CODES.notNumber)
      .optional(),
  );
}

function questionSchema(question: Question): z.ZodType {
  const schema = answerSchema(question);
  // Optional choice questions (E23 age, E24 gender) may be skipped entirely.
  return question.required ? schema : schema.optional();
}

function answerSchema(question: Question): z.ZodType {
  switch (question.type) {
    case "mc":
      return z.enum(
        question.options.map((option) => option.value) as [string, ...string[]],
        { error: ERROR_CODES.required },
      );
    case "checkbox": {
      const values = question.options.map((option) => option.value) as [
        string,
        ...string[],
      ];
      const max = question.maxSelections ?? values.length;
      return z
        .array(z.enum(values), { error: ERROR_CODES.required })
        .min(1, ERROR_CODES.required)
        .max(max, ERROR_CODES.tooMany)
        .refine(
          (selected) => new Set(selected).size === selected.length,
          ERROR_CODES.required,
        );
    }
    case "scale":
      return z
        .number({ error: ERROR_CODES.required })
        .int(ERROR_CODES.required)
        .min(question.min, ERROR_CODES.required)
        .max(question.max, ERROR_CODES.required);
    case "paragraph":
      return textSchema(question, MAX_PARAGRAPH_LENGTH);
    case "text":
      return textSchema(question, MAX_TEXT_LENGTH);
    case "number":
      return countSchema();
  }
}

const answerSchemas = new Map<string, z.ZodType>();

/**
 * Strict: a key that does not belong to this audience fails validation. A
 * question the routing hides is never required, so E01a only becomes required
 * once E01 is Tripoli.
 */
export function answersSchema(
  audience: Audience,
  answers: Answers,
  minor = false,
): z.ZodType {
  const hidden = questionsFor(audience)
    .filter((q) => !isShownTo(q.id, answers, minor))
    .map((q) => q.id);
  const key = `${audience}:${hidden.join(",")}`;
  let schema = answerSchemas.get(key);
  if (!schema) {
    schema = z.strictObject(
      Object.fromEntries(
        questionsFor(audience).map((q) => [
          q.id,
          hidden.includes(q.id) ? questionSchema(q).optional() : questionSchema(q),
        ]),
      ),
    );
    answerSchemas.set(key, schema);
  }
  return schema;
}

/**
 * Removes answers to questions the respondent should not have seen, such as an
 * E01a area left over after E01 changed away from Tripoli. This is also how
 * contact details typed before an opt-in was withdrawn get discarded: they are
 * dropped here rather than stored, on the client and again on the server.
 */
export function withoutHiddenAnswers(answers: Answers, minor = false): Answers {
  return Object.fromEntries(
    Object.entries(answers).filter(([id]) => isShownTo(id, answers, minor)),
  );
}

/** The current audience's answers only, with blanks removed. */
export function answersForSubmission(
  audience: Audience,
  answers: Answers,
  minor = false,
): Answers {
  const entries = questionsFor(audience)
    .filter((question) => isShownTo(question.id, answers, minor))
    .map((question) => [question.id, cleanText(answers[question.id])] as const)
    .filter(([, value]) => value !== undefined && value !== "");
  return Object.fromEntries(entries) as Answers;
}

export const submissionSchema = z
  .object({
    submissionId: z.uuid(),
    locale: z.enum(["en", "ar"]),
    // A response can only exist with consent. Under-18s may take part.
    screening: z.strictObject({ adult: z.boolean(), consent: z.literal(true) }),
    audience: z.enum(["explorer", "club"]),
    answers: z.record(z.string().max(8), z.unknown()),
  })
  // Club organizers must be adults: a minor's club response is refused.
  .refine((submission) => submission.screening.adult || submission.audience === "explorer");
export type Submission = z.infer<typeof submissionSchema>;

export type StoredResponse = {
  submissionId: string;
  audience: Audience;
  locale: "en" | "ar";
  /** False for respondents under 18, who can only answer as explorers. */
  adult: boolean;
  answers: Answers;
  /** Contact details keyed by question ID (E22, E17, C30, C23), each given after its own opt-in. */
  contacts: Record<string, string> | null;
  contactConsent: boolean;
};

export type ValidationResult =
  | { success: true; response: StoredResponse }
  | { success: false; fields: string[] };

/** Validates a parsed submission and splits contact data out of the answers. */
export function validateSubmission(submission: Submission): ValidationResult {
  const { audience } = submission;
  const adult = submission.screening.adult;
  // Questions never shown to under-18s, contact details included, are dropped
  // if a client sends them anyway.
  const pruned = withoutHiddenAnswers(submission.answers as Answers, !adult);
  const parsed = answersSchema(audience, pruned, !adult).safeParse(pruned);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) =>
      String(issue.path[0] ?? (issue as { keys?: string[] }).keys?.[0] ?? ""),
    );
    return { success: false, fields: [...new Set(fields)] };
  }

  const contactIds = new Set(contactQuestionIds(audience));
  const answers: Answers = {};
  const contacts: Record<string, string> = {};
  for (const [id, value] of Object.entries(parsed.data as Answers)) {
    if (value === undefined || value === "") continue;
    if (contactIds.has(id)) contacts[id] = value as string;
    else answers[id] = value;
  }
  const hasContacts = Object.keys(contacts).length > 0;

  return {
    success: true,
    response: {
      submissionId: submission.submissionId,
      audience,
      locale: submission.locale,
      adult,
      answers,
      contacts: hasContacts ? contacts : null,
      contactConsent: hasContacts,
    },
  };
}
