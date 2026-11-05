"use client";

// Renders any question from its typed config. No question has its own screen.
import { useId, useState, type ReactNode } from "react";
import { useController, useFormContext } from "react-hook-form";

import {
  OPTION_ROW_CLASS,
  OptionCheckbox,
  TextArea,
  TextInput,
} from "@/components/ui/kitchn";
import type { Messages } from "@/i18n/messages";
import {
  contactRules,
  MAX_PARAGRAPH_LENGTH,
  MAX_TEXT_LENGTH,
} from "@/survey/config";
import { answerField, type AnswerField, type SurveyValues } from "@/survey/form";
import type {
  ChoiceQuestion,
  MultiChoiceQuestion,
  Question,
  ScaleQuestion,
  TextQuestion,
} from "@/survey/types";

import { useLocale } from "./locale-context";

export function errorText(
  code: string | undefined,
  t: Messages,
  limits?: { maxSelections?: number; maxLength?: number },
): string | undefined {
  if (!code) return undefined;
  switch (code) {
    case "required":
      return t.errors.required;
    case "too_many":
      return t.errors.too_many(limits?.maxSelections ?? 0);
    case "too_long":
      return t.errors.too_long(limits?.maxLength ?? 0);
    case "contact_invalid":
      return t.errors.contact_invalid;
    default:
      return t.errors.fallback;
  }
}

export function FieldError({ id, children }: { id: string; children?: string }) {
  if (!children) return null;
  return (
    <p id={id} className="field-error">
      <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16">
        <circle cx="8" cy="8" r="8" fill="currentColor" />
        <rect x="7.1" y="3.6" width="1.8" height="5.6" rx="0.9" fill="#fff" />
        <circle cx="8" cy="11.6" r="1.1" fill="#fff" />
      </svg>
      <span>{children}</span>
    </p>
  );
}

type RadioRowProps = {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
};

/** Kitchn has no radio control, so this is a native input styled to match its Checkbox. */
export function RadioRow({
  name,
  value,
  checked,
  onChange,
  children,
}: RadioRowProps) {
  return (
    <label className={`${OPTION_ROW_CLASS} radio-row`}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
      />
      <span className="radio-dot" aria-hidden="true" />
      <span className="flex-1">{children}</span>
    </label>
  );
}

type GroupProps = {
  question: Question;
  errorId: string;
  errorMessage?: string;
  role?: "radiogroup";
  describedBy?: string;
  children: ReactNode;
};

function QuestionGroup({
  question,
  errorId,
  errorMessage,
  role,
  describedBy,
  children,
}: GroupProps) {
  const { locale, t } = useLocale();
  const descriptions = [errorMessage && errorId, describedBy]
    .filter(Boolean)
    .join(" ");

  return (
    <fieldset
      className="question"
      data-question-id={question.id}
      role={role}
      aria-required={role && question.required ? true : undefined}
      aria-invalid={role && errorMessage ? true : undefined}
      aria-describedby={descriptions || undefined}
    >
      <legend className="question-prompt">
        {question.prompt[locale]}
        {!question.required && (
          <span className="optional-tag">{t.question.optional}</span>
        )}
      </legend>
      <FieldError id={errorId}>{errorMessage}</FieldError>
      {children}
    </fieldset>
  );
}

function useAnswer(id: string) {
  const name: AnswerField = answerField(id);
  const form = useFormContext<SurveyValues>();
  const { field, fieldState } = useController({ name, control: form.control });

  const setValue = (value: unknown) => {
    field.onChange(value);
    // Errors appear on Next; after that, each one clears as soon as it's fixed.
    if (fieldState.error) void form.trigger(name);
  };

  return { name, form, field, fieldState, setValue };
}

function ChoiceField({ question }: { question: ChoiceQuestion }) {
  const { locale, t } = useLocale();
  const errorId = useId();
  const { name, form, field, fieldState, setValue } = useAnswer(question.id);

  const select = (value: string) => {
    setValue(value);
    // Withdrawing an opt-in discards the contact details immediately.
    for (const [contactId, rule] of Object.entries(contactRules)) {
      if (rule.optInQuestion === question.id && value !== rule.optInValue) {
        const contactField = answerField(contactId);
        form.setValue(contactField, undefined);
        form.clearErrors(contactField);
      }
    }
  };

  return (
    <QuestionGroup
      question={question}
      role="radiogroup"
      errorId={errorId}
      errorMessage={errorText(fieldState.error?.message, t)}
    >
      <div
        className={question.options.length >= 5 ? "option-grid" : "option-list"}
      >
        {question.options.map((option) => (
          <RadioRow
            key={option.value}
            name={name}
            value={option.value}
            checked={field.value === option.value}
            onChange={() => select(option.value)}
          >
            {option.label[locale]}
          </RadioRow>
        ))}
      </div>
    </QuestionGroup>
  );
}

function MultiChoiceField({ question }: { question: MultiChoiceQuestion }) {
  const { locale, t } = useLocale();
  const errorId = useId();
  const statusId = useId();
  const [limitHit, setLimitHit] = useState(false);
  const { field, fieldState, setValue } = useAnswer(question.id);

  const selected: string[] = Array.isArray(field.value) ? field.value : [];
  const max = question.maxSelections;
  const atLimit = max !== undefined && selected.length >= max;

  // At the limit, options stay focusable so keyboard users can still read them.
  // Selecting one more explains the limit instead of silently doing nothing.
  const toggle = (value: string, checked: boolean) => {
    if (checked && atLimit) {
      setLimitHit(true);
      return;
    }
    setLimitHit(false);
    setValue(
      checked ? [...selected, value] : selected.filter((item) => item !== value),
    );
  };

  return (
    <QuestionGroup
      question={question}
      errorId={errorId}
      errorMessage={errorText(fieldState.error?.message, t, {
        maxSelections: max,
      })}
      describedBy={max ? statusId : undefined}
    >
      <div
        className={question.options.length >= 5 ? "option-grid" : "option-list"}
      >
        {question.options.map((option) => {
          const checked = selected.includes(option.value);
          return (
            <OptionCheckbox
              key={option.value}
              checked={checked}
              atLimit={atLimit && !checked}
              onChange={(next) => toggle(option.value, next)}
            >
              {option.label[locale]}
            </OptionCheckbox>
          );
        })}
      </div>
      {max && (
        <p
          id={statusId}
          aria-live="polite"
          className={limitHit ? "selection-status is-limit" : "selection-status"}
        >
          {limitHit
            ? t.question.limitReached(max)
            : t.question.selectedCount(selected.length, max)}
        </p>
      )}
    </QuestionGroup>
  );
}

function ScaleField({ question }: { question: ScaleQuestion }) {
  const { locale, t } = useLocale();
  const errorId = useId();
  const { name, field, fieldState, setValue } = useAnswer(question.id);
  const points = Array.from(
    { length: question.max - question.min + 1 },
    (_, index) => question.min + index,
  );

  return (
    <QuestionGroup
      question={question}
      role="radiogroup"
      errorId={errorId}
      errorMessage={errorText(fieldState.error?.message, t)}
    >
      <div className="scale">
        {points.map((point) => {
          const endLabel =
            point === question.min
              ? question.minLabel[locale]
              : point === question.max
                ? question.maxLabel[locale]
                : undefined;
          return (
            <label key={point} className="scale-point">
              <input
                type="radio"
                name={name}
                value={point}
                checked={field.value === point}
                onChange={() => setValue(point)}
                aria-label={endLabel ? `${point}, ${endLabel}` : String(point)}
              />
              <span aria-hidden="true">{point}</span>
            </label>
          );
        })}
      </div>
      <div className="scale-labels" aria-hidden="true">
        <span>{question.minLabel[locale]}</span>
        <span>{question.maxLabel[locale]}</span>
      </div>
    </QuestionGroup>
  );
}

function FreeTextField({ question }: { question: TextQuestion }) {
  const { locale, t } = useLocale();
  const inputId = useId();
  const errorId = useId();
  const hintId = useId();
  const { name, form, field, fieldState, setValue } = useAnswer(question.id);

  const isParagraph = question.type === "paragraph";
  const maxLength = isParagraph ? MAX_PARAGRAPH_LENGTH : MAX_TEXT_LENGTH;
  const value = typeof field.value === "string" ? field.value : "";
  const message = errorText(fieldState.error?.message, t, { maxLength });

  const hint = contactRules[question.id]
    ? t.question.contactHint
    : question.id === "C21"
      ? t.question.clubIdentityHint
      : undefined;

  const shared = {
    id: inputId,
    name,
    ref: field.ref,
    value,
    dir: "auto",
    "aria-invalid": message ? true : undefined,
    "aria-describedby":
      [message && errorId, hint && hintId].filter(Boolean).join(" ") || undefined,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setValue(event.target.value),
    onBlur: () => {
      field.onBlur();
      // Format problems are worth flagging as soon as the person moves on.
      if (value) void form.trigger(name);
    },
  };

  return (
    <div className="question" data-question-id={question.id}>
      <label htmlFor={inputId} className="question-prompt">
        {question.prompt[locale]}
        {/* The wording of short-text questions already says they're optional. */}
        {isParagraph && (
          <span className="optional-tag">{t.question.optional}</span>
        )}
      </label>
      {hint && (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      )}
      <FieldError id={errorId}>{message}</FieldError>
      {isParagraph ? (
        <>
          <TextArea {...shared} rows={5} />
          <p className="selection-status">
            {t.question.characters(value.length, maxLength)}
          </p>
        </>
      ) : (
        // Emails and handles must survive phone keyboards unchanged.
        <TextInput
          {...shared}
          size="large"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
      )}
    </div>
  );
}

export function QuestionField({ question }: { question: Question }) {
  switch (question.type) {
    case "mc":
      return <ChoiceField question={question} />;
    case "checkbox":
      return <MultiChoiceField question={question} />;
    case "scale":
      return <ScaleField question={question} />;
    case "paragraph":
    case "text":
      return <FreeTextField question={question} />;
  }
}
