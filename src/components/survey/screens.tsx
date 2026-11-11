"use client";

import { forwardRef, useId, type ReactNode } from "react";
import { useController, useFormContext, useWatch } from "react-hook-form";

import { Button, Card, CardContent, Note } from "@/components/ui/kitchn";
import {
  getQuestion,
  isShownTo,
  stepsByAudience,
  type QuestionPage,
} from "@/survey/config";
import type { SurveyValues } from "@/survey/form";
import type {
  AnswerValue,
  Answers,
  Audience,
  Locale,
  Question,
} from "@/survey/types";

import {
  errorText,
  FieldError,
  PageHeadingContext,
  QuestionField,
  QuestionTitle,
  RadioRow,
  type HeadingRef,
} from "./fields";
import { useLocale } from "./locale-context";

export type { HeadingRef };

/** Receives focus on every screen change, so screen readers follow the flow. */
export const ScreenHeading = forwardRef<
  HTMLHeadingElement,
  { children: ReactNode; large?: boolean }
>(function ScreenHeading({ children, large }, ref) {
  return (
    <h1
      ref={ref}
      tabIndex={-1}
      className={large ? "display-title" : "screen-title"}
    >
      {children}
    </h1>
  );
});

export function Welcome({
  headingRef,
  onStart,
}: {
  headingRef: HeadingRef;
  onStart: () => void;
}) {
  const { t } = useLocale();
  return (
    <div className="welcome">
      <ScreenHeading ref={headingRef} large>
        {t.welcome.title}
      </ScreenHeading>
      <p className="lede">{t.welcome.intro}</p>
      <dl className="facts">
        {t.welcome.facts.map((fact) => (
          <div key={fact.label}>
            <dt>{fact.label}</dt>
            <dd>{fact.text}</dd>
          </div>
        ))}
      </dl>
      <div>
        <Button size="large" onClick={onStart}>
          {t.welcome.start}
        </Button>
      </div>
      <section aria-labelledby="privacy-heading" className="privacy">
        <h2 id="privacy-heading">{t.welcome.privacyTitle}</h2>
        <ul>
          {t.welcome.privacy.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function YesNoField({
  name,
  question,
  hint,
  yes,
  no,
}: {
  name: "adult" | "consent";
  question: string;
  hint?: string;
  yes: string;
  no: string;
}) {
  const { t } = useLocale();
  const errorId = useId();
  const hintId = useId();
  const form = useFormContext<SurveyValues>();
  const { field, fieldState } = useController({ name, control: form.control });
  const message = errorText(fieldState.error?.message, t);
  const select = (value: "yes" | "no") => {
    field.onChange(value);
    if (fieldState.error) void form.trigger(name);
  };

  return (
    <fieldset
      className="question"
      data-question-id={name}
      role="radiogroup"
      aria-required="true"
      aria-invalid={message ? true : undefined}
      aria-describedby={[hint && hintId, message && errorId].filter(Boolean).join(" ") || undefined}
    >
      <legend className="question-prompt">
        <QuestionTitle>{question}</QuestionTitle>
      </legend>
      {hint && (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      )}
      <FieldError id={errorId}>{message}</FieldError>
      <div className="option-list">
        <RadioRow
          name={name}
          value="yes"
          checked={field.value === "yes"}
          onChange={() => select("yes")}
        >
          {yes}
        </RadioRow>
        <RadioRow
          name={name}
          value="no"
          checked={field.value === "no"}
          onChange={() => select("no")}
        >
          {no}
        </RadioRow>
      </div>
    </fieldset>
  );
}

/** Age and consent each get their own page, so a "No" ends the survey at once. */
export function Screening({
  name,
}: {
  name: "adult" | "consent";
}) {
  const { t } = useLocale();
  return (
    <PageHeadingContext.Provider value>
      {name === "adult" ? (
        <YesNoField
          name="adult"
          question={t.screening.adultQuestion}
          hint={t.screening.intro}
          yes={t.screening.adultYes}
          no={t.screening.adultNo}
        />
      ) : (
        <YesNoField
          name="consent"
          question={t.screening.consentQuestion}
          yes={t.screening.consentYes}
          no={t.screening.consentNo}
        />
      )}
    </PageHeadingContext.Provider>
  );
}

export function ExitScreen({
  headingRef,
  onBack,
}: {
  headingRef: HeadingRef;
  onBack: () => void;
}) {
  const { t } = useLocale();
  return (
    <div className="end-screen">
      <ScreenHeading ref={headingRef}>{t.exit.declinedTitle}</ScreenHeading>
      <p className="lede">{t.exit.declinedBody}</p>
      <div>
        <Button variant="ghost" type="primary" data-edge="start" onClick={onBack}>
          {t.exit.back}
        </Button>
      </div>
    </div>
  );
}

export function AudienceChoice({
  headingRef,
}: {
  headingRef: HeadingRef;
}) {
  const { t } = useLocale();
  const headingId = useId();
  const hintId = useId();
  const errorId = useId();
  const form = useFormContext<SurveyValues>();
  const { field, fieldState } = useController({
    name: "audience",
    control: form.control,
  });
  const message = errorText(fieldState.error?.message, t);
  const select = (value: Audience) => {
    field.onChange(value);
    if (fieldState.error) void form.trigger("audience");
  };

  const choices: { value: Audience; title: string; body: string }[] = [
    {
      value: "explorer",
      title: t.audience.explorerTitle,
      body: t.audience.explorerBody,
    },
    { value: "club", title: t.audience.clubTitle, body: t.audience.clubBody },
  ];

  return (
    <>
      <div id={headingId}>
        <ScreenHeading ref={headingRef}>
          {t.audience.title}
        </ScreenHeading>
      </div>
      <p id={hintId} className="screen-intro">
        {t.audience.hint}
      </p>
      <div
        className="question"
        data-question-id="audience"
        role="radiogroup"
        aria-labelledby={headingId}
        aria-describedby={[hintId, message && errorId].filter(Boolean).join(" ")}
        aria-required="true"
        aria-invalid={message ? true : undefined}
      >
        <FieldError id={errorId}>{message}</FieldError>
        <div className="audience-grid">
          {choices.map((choice) => (
            <RadioRow
              key={choice.value}
              name="audience"
              value={choice.value}
              checked={field.value === choice.value}
              onChange={() => select(choice.value)}
            >
              <span className="audience-title">{choice.title}</span>
              <span className="audience-body">{choice.body}</span>
            </RadioRow>
          ))}
        </div>
      </div>
    </>
  );
}

export function QuestionPageView({
  headingRef,
  audience,
  minor,
  page,
}: {
  headingRef: HeadingRef;
  audience: Audience;
  minor: boolean;
  page: QuestionPage;
}) {
  const { locale } = useLocale();
  const form = useFormContext<SurveyValues>();
  const answers = useWatch({ control: form.control, name: "answers" }) ?? {};
  const shown = page.questionIds
    .filter((id) => isShownTo(id, answers, minor))
    .map(getQuestion);

  // A lone question is the page heading itself.
  if (shown.length === 1) {
    return (
      <PageHeadingContext.Provider value>
        <QuestionField question={shown[0]} />
      </PageHeadingContext.Provider>
    );
  }
  return (
    <>
      <ScreenHeading ref={headingRef}>
        {stepsByAudience[audience][page.section].title[locale]}
      </ScreenHeading>
      <div className="question-stack">
        {shown.map((question) => (
          <QuestionField key={question.id} question={question} />
        ))}
      </div>
    </>
  );
}

export function formatAnswer(
  question: Question,
  value: AnswerValue,
  locale: Locale,
): string | undefined {
  if (value === undefined || value === "") return undefined;
  switch (question.type) {
    case "mc":
      return question.options.find((option) => option.value === value)?.label[
        locale
      ];
    case "checkbox": {
      if (!Array.isArray(value) || value.length === 0) return undefined;
      return question.options
        .filter((option) => value.includes(option.value))
        .map((option) => option.label[locale])
        .join(locale === "ar" ? "، " : ", ");
    }
    case "scale": {
      if (value === question.min) return `${value} (${question.minLabel[locale]})`;
      if (value === question.max) return `${value} (${question.maxLabel[locale]})`;
      return String(value);
    }
    default:
      return String(value);
  }
}

export function Review({
  headingRef,
  audience,
  minor,
  answers,
  onEdit,
  children,
}: {
  headingRef: HeadingRef;
  audience: Audience;
  minor: boolean;
  answers: Answers;
  onEdit: (stepIndex: number) => void;
  children: ReactNode;
}) {
  const { locale, t } = useLocale();
  return (
    <>
      <ScreenHeading ref={headingRef}>
        {t.review.title}
      </ScreenHeading>
      <p className="screen-intro">{t.review.intro}</p>
      <div className="review-stack">
        {stepsByAudience[audience].map((step, index) => {
          const headingId = `review-${step.id}`;
          return (
            <Card key={step.id} aria-labelledby={headingId}>
              <CardContent>
                <div className="review-head">
                  <h2 id={headingId}>{step.title[locale]}</h2>
                  <Button
                    size="small"
                    variant="ghost"
                    type="primary"
                    data-edge="end"
                    aria-label={t.review.edit(step.title[locale])}
                    onClick={() => onEdit(index)}
                  >
                    {t.review.edit("").trim()}
                  </Button>
                </div>
                <dl className="review-list">
                  {step.questionIds
                    .filter((id) => isShownTo(id, answers, minor))
                    .map((id) => {
                      const question = getQuestion(id);
                      const formatted = formatAnswer(
                        question,
                        answers[id],
                        locale,
                      );
                      return (
                        <div key={id} data-review-id={id}>
                          <dt>{question.prompt[locale]}</dt>
                          <dd className={formatted ? undefined : "is-empty"}>
                            {formatted ? (
                              <bdi>{formatted}</bdi>
                            ) : (
                              t.review.notAnswered
                            )}
                          </dd>
                        </div>
                      );
                    })}
                </dl>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {children}
    </>
  );
}

export function Thanks({
  headingRef,
  audience,
  optedIn,
  onOtherSurvey,
}: {
  headingRef: HeadingRef;
  audience?: Audience;
  optedIn: boolean;
  /** Absent for under-18s, who can't take the club survey. */
  onOtherSurvey?: () => void;
}) {
  const { t } = useLocale();
  return (
    <div className="end-screen">
      <ScreenHeading ref={headingRef} large>
        {t.thanks.title}
      </ScreenHeading>
      <p className="lede">{t.thanks.body}</p>
      {optedIn && <Note type="secondary">{t.thanks.contactOptIn}</Note>}
      {onOtherSurvey && (
        <div className="other-survey">
          <p>
            {audience === "club"
              ? t.thanks.otherSurveyClub
              : t.thanks.otherSurveyExplorer}
          </p>
          <Button variant="ghost" type="primary" onClick={onOtherSurvey}>
            {t.thanks.takeOtherSurvey}
          </Button>
        </div>
      )}
    </div>
  );
}
