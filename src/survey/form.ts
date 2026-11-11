import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver } from "react-hook-form";
import { z } from "zod";

import type { YesNo } from "./flow";
import { answersForSubmission, answersSchema, ERROR_CODES } from "./schema";
import { AUDIENCES, type Answers, type Audience } from "./types";

export type SurveyValues = {
  adult?: YesNo;
  consent?: YesNo;
  audience?: Audience;
  answers: Answers;
  /** Honeypot. Hidden from people, tempting to bots. */
  company_website: string;
};

export type AnswerField = `answers.${string}`;

export function answerField(questionId: string): AnswerField {
  return `answers.${questionId}`;
}

export function emptyValues(): SurveyValues {
  return { answers: {}, company_website: "" };
}

const yesNo = z.enum(["yes", "no"], { error: ERROR_CODES.required });
const audience = z.enum(AUDIENCES, { error: ERROR_CODES.required });

/**
 * Validates against the chosen audience's schema after setting aside what would
 * not be submitted (hidden questions, the other audience's answers). React Hook
 * Form then reports only the fields of the step being checked.
 */
export const surveyResolver: Resolver<SurveyValues> = (
  values,
  context,
  options,
) => {
  const minor = values.adult === "no";
  const answers = values.audience
    ? answersForSubmission(values.audience, values.answers, minor)
    : values.answers;
  const schema = z.object({
    adult: yesNo,
    consent: yesNo,
    audience,
    answers: values.audience ? answersSchema(values.audience, answers, minor) : z.any(),
    company_website: z.string(),
  });
  const candidate = { ...values, answers };
  // The dynamic schema is checked at runtime, so its static type adds nothing.
  return (zodResolver(schema as never) as unknown as Resolver<SurveyValues>)(
    candidate,
    context,
    options,
  );
};
