// Validation shared by the browser (for inline errors) and the server (for
// enforcement). Issue messages are codes; the UI translates them.
import { z } from "zod";

import {
  contactQuestionFor,
  contactRules,
  isQuestionVisible,
  MAX_PARAGRAPH_LENGTH,
  MAX_TEXT_LENGTH,
  questionsFor,
  type ContactFormat,
} from "./config";
import type { Answers, Audience, Question } from "./types";

export const ERROR_CODES = {
  required: "required",
  tooMany: "too_many",
  tooLong: "too_long",
  contactInvalid: "contact_invalid",
} as const;
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

const CONTACT_PATTERNS: Record<ContactFormat, RegExp> = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  // Accepts a bare handle, @handle or a profile link.
  instagram:
    /^(?:https?:\/\/)?(?:www\.)?(?:instagram\.com\/)?@?[A-Za-z0-9._]{1,30}\/?$/,
  // Accepts Western and Arabic-Indic digits, which Lebanese keyboards can produce.
  phone: /^\+?[0-9٠-٩\s().-]{7,20}$/,
};

// Newlines and tabs stay; other control characters have no place in an answer.
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

function cleanText(value: unknown): unknown {
  return typeof value === "string"
    ? value.replace(CONTROL_CHARACTERS, "").trim()
    : value;
}

function textSchema(question: Question, maxLength: number) {
  const rule = contactRules[question.id];
  return z.preprocess(
    cleanText,
    z
      .string()
      .max(maxLength, ERROR_CODES.tooLong)
      .refine(
        (value) =>
          !rule ||
          value === "" ||
          rule.formats.some((format) => CONTACT_PATTERNS[format].test(value)),
        ERROR_CODES.contactInvalid,
      )
      .optional(),
  );
}

function questionSchema(question: Question): z.ZodType {
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
  }
}

const answerSchemas = new Map<Audience, z.ZodType>();

/** Strict: a key that does not belong to this audience fails validation. */
export function answersSchema(audience: Audience): z.ZodType {
  let schema = answerSchemas.get(audience);
  if (!schema) {
    schema = z.strictObject(
      Object.fromEntries(
        questionsFor(audience).map((q) => [q.id, questionSchema(q)]),
      ),
    );
    answerSchemas.set(audience, schema);
  }
  return schema;
}

/**
 * Removes answers to questions the respondent should not have seen. This is how
 * contact details typed before an opt-in was withdrawn get discarded: they are
 * dropped here rather than stored, on the client and again on the server.
 */
export function withoutHiddenAnswers(answers: Answers): Answers {
  return Object.fromEntries(
    Object.entries(answers).filter(([id]) => isQuestionVisible(id, answers)),
  );
}

/** The current audience's answers only, with blanks removed. */
export function answersForSubmission(
  audience: Audience,
  answers: Answers,
): Answers {
  const entries = questionsFor(audience)
    .filter((question) => isQuestionVisible(question.id, answers))
    .map((question) => [question.id, cleanText(answers[question.id])] as const)
    .filter(([, value]) => value !== undefined && value !== "");
  return Object.fromEntries(entries) as Answers;
}

export const submissionSchema = z.object({
  submissionId: z.uuid(),
  locale: z.enum(["en", "ar"]),
  // A response can only exist if both screening answers were affirmative.
  screening: z.strictObject({ adult: z.literal(true), consent: z.literal(true) }),
  audience: z.enum(["explorer", "club"]),
  answers: z.record(z.string().max(8), z.unknown()),
});
export type Submission = z.infer<typeof submissionSchema>;

export type StoredResponse = {
  submissionId: string;
  audience: Audience;
  locale: "en" | "ar";
  answers: Answers;
  contact: string | null;
  contactConsent: boolean;
};

export type ValidationResult =
  | { success: true; response: StoredResponse }
  | { success: false; fields: string[] };

/** Validates a parsed submission and splits contact data out of the answers. */
export function validateSubmission(submission: Submission): ValidationResult {
  const { audience } = submission;
  const pruned = withoutHiddenAnswers(submission.answers as Answers);
  const parsed = answersSchema(audience).safeParse(pruned);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) =>
      String(issue.path[0] ?? (issue as { keys?: string[] }).keys?.[0] ?? ""),
    );
    return { success: false, fields: [...new Set(fields)] };
  }

  const answers = parsed.data as Answers;
  const contactId = contactQuestionFor(audience);
  const { [contactId]: rawContact, ...rest } = answers;
  const contact =
    typeof rawContact === "string" && rawContact !== "" ? rawContact : null;

  return {
    success: true,
    response: {
      submissionId: submission.submissionId,
      audience,
      locale: submission.locale,
      answers: Object.fromEntries(
        Object.entries(rest).filter(([, value]) => value !== ""),
      ) as Answers,
      contact,
      contactConsent: contact !== null,
    },
  };
}
