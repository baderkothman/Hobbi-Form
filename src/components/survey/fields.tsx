"use client";

// Renders any question from its typed config. No question has its own screen.
import {
  createContext,
  useContext,
  useId,
  useState,
  type ReactNode,
  type Ref,
} from "react";
import { useController, useFormContext } from "react-hook-form";

import {
  OPTION_ROW_CLASS,
  OptionCheckbox,
  TextArea,
  TextInput,
} from "@/components/ui/kitchn";
import type { Messages } from "@/i18n/messages";
import {
  dependentsOf,
  isQuestionVisible,
  MAX_PARAGRAPH_LENGTH,
  MAX_TEXT_LENGTH,
  usesTwoColumns,
} from "@/survey/config";
import { answerField, type AnswerField, type SurveyValues } from "@/survey/form";
import type {
  ChoiceQuestion,
  MultiChoiceQuestion,
  NumberQuestion,
  Question,
  ScaleQuestion,
  TextQuestion,
} from "@/survey/types";

import { ContactInput } from "./ContactInput";
import { useLocale } from "./locale-context";

export type HeadingRef = Ref<HTMLHeadingElement>;

/**
 * When a page holds a single question, that question is the page's heading:
 * its prompt renders as the h1 that takes focus on arrival, so screen reader
 * users land on the question itself.
 */
export const PageHeadingContext = createContext(false);

export function QuestionTitle({
  id,
  children,
}: {
  id?: string;
  children: ReactNode;
}) {
  const isPageHeading = useContext(PageHeadingContext);
  if (!isPageHeading) return <>{children}</>;
  return (
    <h1 id={id} tabIndex={-1} className="question-title">
      {children}
    </h1>
  );
}

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
    case "not_number":
      return t.errors.not_number;
    default:
      return t.errors.fallback;
  }
}

/**
 * Short labels sit two to a row everywhere. Lists of four or more get two
 * columns on wider screens, and long lists get tighter rows on phones.
 */
function optionLayout(question: ChoiceQuestion | MultiChoiceQuestion): string {
  if (usesTwoColumns(question)) return "option-grid two-up";
  const count = question.options.length;
  const base = count >= 4 ? "option-grid" : "option-list";
  return count >= 9 ? `${base} is-long` : base;
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
  const hintId = useId();
  const hint = question.hint?.[locale];
  const descriptions = [hint && hintId, errorMessage && errorId, describedBy]
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
        <QuestionTitle>
          {question.prompt[locale]}
          {!question.required && (
            <span className="optional-tag">{t.question.optional}</span>
          )}
        </QuestionTitle>
      </legend>
      {hint && (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      )}
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
    // An answer can hide other questions: moving E01 away from Tripoli hides
    // E01a, and withdrawing an opt-in hides its contact field. Their answers
    // are discarded at once, so nothing hidden is ever sent.
    const answers = form.getValues("answers");
    for (const dependent of dependentsOf(id)) {
      if (!isQuestionVisible(dependent, answers)) {
        form.setValue(answerField(dependent), undefined);
        form.clearErrors(answerField(dependent));
      }
    }
  };

  return { name, form, field, fieldState, setValue };
}

function ChoiceField({ question }: { question: ChoiceQuestion }) {
  const { locale, t } = useLocale();
  const errorId = useId();
  const { name, field, fieldState, setValue } = useAnswer(question.id);
  const select = (value: string) => setValue(value);

  return (
    <QuestionGroup
      question={question}
      role="radiogroup"
      errorId={errorId}
      errorMessage={errorText(fieldState.error?.message, t)}
    >
      <div
        className={optionLayout(question)}
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
        className={optionLayout(question)}
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

function FreeTextField({
  question,
}: {
  question: TextQuestion | NumberQuestion;
}) {
  const { locale, t } = useLocale();
  const inputId = useId();
  const errorId = useId();
  const hintId = useId();
  const { name, form, field, fieldState, setValue } = useAnswer(question.id);

  const isPageHeading = useContext(PageHeadingContext);
  const titleId = useId();
  const isParagraph = question.type === "paragraph";
  const isNumber = question.type === "number";
  const validation = question.type === "text" ? question.validation : undefined;
  const maxLength = isParagraph ? MAX_PARAGRAPH_LENGTH : MAX_TEXT_LENGTH;
  const value =
    typeof field.value === "string" || typeof field.value === "number"
      ? String(field.value)
      : "";
  const message = errorText(fieldState.error?.message, t, { maxLength });

  const prompt = (
    <>
      {question.prompt[locale]}
      {/* Short-text prompts and hints already say they're optional. */}
      {(isParagraph || isNumber) && !question.required && (
        <span className="optional-tag">{t.question.optional}</span>
      )}
    </>
  );

  const hint =
    question.hint?.[locale] ??
    (question.id === "C21" ? t.question.clubIdentityHint : undefined);

  const shared = {
    id: inputId,
    name,
    ref: field.ref,
    value,
    dir: "auto",
    // As the page heading, the prompt is an h1 that can't be a <label>.
    "aria-labelledby": isPageHeading ? titleId : undefined,
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
      {isPageHeading ? (
        <div className="question-prompt">
          <QuestionTitle id={titleId}>{prompt}</QuestionTitle>
        </div>
      ) : (
        <label htmlFor={inputId} className="question-prompt">
          {prompt}
        </label>
      )}
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
      ) : validation ? (
        <ContactInput
          id={inputId}
          name={name}
          inputRef={field.ref}
          value={value}
          allowEmail={validation === "phoneOrEmail"}
          labelledBy={isPageHeading ? titleId : undefined}
          describedBy={shared["aria-describedby"]}
          invalid={Boolean(message)}
          onChange={setValue}
          onBlur={shared.onBlur}
        />
      ) : (
        <TextInput
          {...shared}
          size="large"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          inputMode={isNumber ? "numeric" : validation === "phone" ? "tel" : "text"}
          {...(isNumber && { className: "count-input" })}
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
    case "number":
      return <FreeTextField question={question} />;
  }
}
