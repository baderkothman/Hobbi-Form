"use client";

// Owns the survey's state: the current screen, the language, the form and the
// submission. What each screen renders lives in screens.tsx and fields.tsx.
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";

import { Button, Note, ProgressBar } from "@/components/ui/kitchn";
import { messages } from "@/i18n/messages";
import {
  isQuestionVisible,
  questionsFor,
  stepsByAudience,
  visibleQuestions,
} from "@/survey/config";
import {
  afterScreening,
  completedFraction,
  nextScreen,
  previousScreen,
  stepNumber,
  TOTAL_STEPS,
  type Screen,
} from "@/survey/flow";
import {
  answerField,
  emptyValues,
  surveyResolver,
  type SurveyValues,
} from "@/survey/form";
import { directionFor, type Locale } from "@/survey/types";

import { clearDraft, loadDraft, saveDraft } from "./draft";
import { LocaleProvider } from "./locale-context";
import { Mosaic } from "./Mosaic";
import {
  AudienceChoice,
  ExitScreen,
  QuestionStep,
  Review,
  Screening,
  Thanks,
  Welcome,
} from "./screens";
import { submitSurvey, type SubmitFailure } from "./submit-survey";

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "failed"; failure: SubmitFailure };

const WELCOME: Screen = { name: "welcome" };

export function SurveyApp({ initialLocale }: { initialLocale: Locale }) {
  const [locale, setLocale] = useState(initialLocale);
  const [screen, setScreen] = useState<Screen>(WELCOME);
  const [returnToReview, setReturnToReview] = useState(false);
  const [submit, setSubmit] = useState<SubmitState>({ status: "idle" });
  const [restored, setRestored] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [lastSubmission, setLastSubmission] = useState<{
    audience?: SurveyValues["audience"];
    optedIn: boolean;
  }>({ optedIn: false });

  const submissionId = useRef<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const hasNavigated = useRef(false);
  const stepCounterId = useId();

  const form = useForm<SurveyValues>({
    resolver: surveyResolver,
    defaultValues: emptyValues(),
    shouldFocusError: false,
  });
  const audience = useWatch({ control: form.control, name: "audience" });
  const answers = useWatch({ control: form.control, name: "answers" });

  const t = messages[locale];

  const go = useCallback((next: Screen) => {
    hasNavigated.current = true;
    setNotice(null);
    setSubmit({ status: "idle" });
    setScreen(next);
    window.history.pushState({ hobbiScreen: next }, "");
  }, []);

  // Restore after mount, so the server and first client render match.
  useEffect(() => {
    window.history.replaceState(
      { ...window.history.state, hobbiScreen: WELCOME },
      "",
    );
    const draft = loadDraft();
    if (draft) {
      submissionId.current = draft.submissionId;
      form.reset(draft.values);
      // sessionStorage doesn't exist during the server render, so a draft can
      // only be applied after mount. The extra render is the point.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setScreen(draft.screen);
      setRestored(true);
      window.history.replaceState(
        { ...window.history.state, hobbiScreen: draft.screen },
        "",
      );
    }
    // Runs once: the form instance is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The browser's Back and Forward buttons move through the survey's steps.
  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const target = event.state?.hobbiScreen as Screen | undefined;
      if (!target) return;
      hasNavigated.current = true;
      setNotice(null);
      setSubmit({ status: "idle" });
      // A finished survey stays finished: Back must not reopen a sent response.
      setScreen((current) => (current.name === "thanks" ? current : target));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Every screen change starts at the top with focus on the new heading.
  useEffect(() => {
    if (!hasNavigated.current) return;
    window.scrollTo(0, 0);
    headingRef.current?.focus({ preventScroll: true });
  }, [screen]);

  // Keep the draft current on every change, while there is something to keep.
  useEffect(() => {
    if (!["screening", "audience", "questions", "review"].includes(screen.name)) {
      return;
    }
    submissionId.current ??= crypto.randomUUID();
    const save = () =>
      saveDraft({
        submissionId: submissionId.current as string,
        screen,
        values: form.getValues(),
      });
    save();
    return form.subscribe({ formState: { values: true }, callback: save });
  }, [screen, form]);

  // The page is pre-rendered per language. Switching updates the document and
  // the URL in place, so nothing typed so far is lost.
  const switchLocale = () => {
    const next: Locale = locale === "ar" ? "en" : "ar";
    setLocale(next);
    document.documentElement.lang = next;
    document.documentElement.dir = directionFor(next);
    document.title = messages[next].meta.title;
    window.history.replaceState(window.history.state, "", `/${next}`);
  };

  const focusQuestion = (questionId: string) => {
    const group = document.querySelector<HTMLElement>(
      `[data-question-id="${questionId}"]`,
    );
    group?.scrollIntoView({ block: "start" });
    group
      ?.querySelector<HTMLElement>("input, textarea")
      ?.focus({ preventScroll: true });
  };

  const validateAndFocus = async (
    entries: { field: Parameters<typeof form.trigger>[0]; focusId: string }[],
  ) => {
    const valid = await form.trigger(
      entries.map((entry) => entry.field) as never,
    );
    if (!valid) {
      const firstInvalid = entries.find(
        (entry) =>
          form.getFieldState(entry.field as "audience").error !== undefined,
      );
      if (firstInvalid) focusQuestion(firstInvalid.focusId);
    }
    return valid;
  };

  const handleNext = async () => {
    if (screen.name === "screening") {
      const valid = await validateAndFocus([
        { field: "adult", focusId: "adult" },
        { field: "consent", focusId: "consent" },
      ]);
      if (!valid) return;
      const { adult, consent } = form.getValues();
      const next = afterScreening(adult!, consent!);
      // Nobody who stops here leaves anything behind on the device.
      if (next.name !== "audience") clearDraft();
      go(next);
      return;
    }
    if (screen.name === "audience") {
      const valid = await validateAndFocus([
        { field: "audience", focusId: "audience" },
      ]);
      if (valid) go(nextScreen(screen, audience));
      return;
    }
    if (screen.name === "questions" && audience) {
      const step = stepsByAudience[audience][screen.step];
      const valid = await validateAndFocus(
        visibleQuestions(step, form.getValues("answers")).map((question) => ({
          field: answerField(question.id),
          focusId: question.id,
        })),
      );
      if (!valid) return;
      if (returnToReview) {
        setReturnToReview(false);
        go({ name: "review" });
      } else {
        go(nextScreen(screen, audience));
      }
    }
  };

  const handlePrevious = () => {
    setReturnToReview(false);
    go(previousScreen(screen, audience));
  };

  const editStep = (step: number) => {
    setReturnToReview(true);
    go({ name: "questions", step });
  };

  const openQuestionForFixing = (questionId: string) => {
    if (!audience) return;
    const step = stepsByAudience[audience].findIndex((candidate) =>
      candidate.questionIds.includes(questionId),
    );
    if (step === -1) return;
    setReturnToReview(true);
    go({ name: "questions", step });
    setNotice(t.review.invalid);
    window.setTimeout(() => focusQuestion(questionId), 0);
  };

  const handleSubmit = async () => {
    if (!audience || submit.status === "submitting") return;

    // Back, Forward or a restored draft can skip steps, so check everything.
    const values = form.getValues();
    const active = questionsFor(audience).filter((question) =>
      isQuestionVisible(question.id, values.answers),
    );
    const valid = await form.trigger(
      active.map((question) => answerField(question.id)),
    );
    if (!valid) {
      const firstInvalid = active.find(
        (question) =>
          form.getFieldState(answerField(question.id)).error !== undefined,
      );
      if (firstInvalid) openQuestionForFixing(firstInvalid.id);
      return;
    }

    setSubmit({ status: "submitting" });
    const result = await submitSurvey(
      values,
      audience,
      locale,
      submissionId.current ?? crypto.randomUUID(),
    );

    if (result.ok) {
      const contact = active.find((question) =>
        ["E17", "C23"].includes(question.id),
      );
      setLastSubmission({
        audience,
        optedIn: Boolean(contact && values.answers[contact.id]),
      });
      clearDraft();
      submissionId.current = null;
      setRestored(false);
      go({ name: "thanks" });
      return;
    }

    const known = result.fields?.find((id) =>
      questionsFor(audience).some((question) => question.id === id),
    );
    if (result.failure === "invalid" && known) {
      form.setError(answerField(known), { message: "fallback" });
      setSubmit({ status: "idle" });
      openQuestionForFixing(known);
      return;
    }
    setSubmit({ status: "failed", failure: result.failure });
  };

  const startOtherSurvey = () => {
    form.reset({
      ...emptyValues(),
      adult: "yes",
      consent: "yes",
      audience: lastSubmission.audience === "club" ? "explorer" : "club",
    });
    go({ name: "questions", step: 0 });
  };

  const startOver = () => {
    clearDraft();
    submissionId.current = null;
    form.reset(emptyValues());
    setRestored(false);
    setReturnToReview(false);
    go(WELCOME);
  };

  const currentStep = stepNumber(screen);
  const isReview = screen.name === "review" && audience;
  const showsNav = currentStep !== null && !isReview;
  const fullBleed = screen.name === "welcome" || screen.name === "thanks";

  const errorCount = (() => {
    const errors = form.formState.errors;
    if (screen.name === "questions" && audience) {
      return visibleQuestions(
        stepsByAudience[audience][screen.step],
        answers ?? {},
      ).filter((question) => errors.answers?.[question.id]).length;
    }
    if (screen.name === "screening") {
      return [errors.adult, errors.consent].filter(Boolean).length;
    }
    if (screen.name === "audience") return errors.audience ? 1 : 0;
    return 0;
  })();

  return (
    <LocaleProvider value={locale}>
      <FormProvider {...form}>
        <div className="shell" data-screen={screen.name}>
          <div className="shell-content">
            <header className="topbar">
              <span className="wordmark" dir="ltr" translate="no">
                <svg viewBox="0 0 100 100" width="26" height="26" aria-hidden="true">
                  <rect width="100" height="100" rx="14" fill="#087F72" />
                  {[0, 90, 180, 270].map((turn) => (
                    <path
                      key={turn}
                      d="M50 50 Q50 8 8 8 Q8 50 50 50Z"
                      fill={turn === 0 ? "#FFC857" : "#fff"}
                      transform={`rotate(${turn} 50 50)`}
                    />
                  ))}
                </svg>
                Hobbi
              </span>
              <Button
                size="small"
                variant="ghost"
                type="primary"
                lang={locale === "ar" ? "en" : "ar"}
                onClick={switchLocale}
                data-edge="end"
                data-testid="language-switch"
              >
                {t.common.switchLanguage}
              </Button>
            </header>

            {currentStep !== null && (
              <div className="step-progress">
                <p id={stepCounterId}>
                  {t.common.stepCounter(currentStep, TOTAL_STEPS)}
                </p>
                <ProgressBar value={currentStep} max={TOTAL_STEPS} />
              </div>
            )}

            {/* Without JS the question flow can't run: say so rather than show a dead button. */}
            <noscript>
              <p className="noscript">
                {locale === "ar"
                  ? "يتطلب هذا الاستطلاع تفعيل JavaScript."
                  : "This survey needs JavaScript to be turned on."}
              </p>
            </noscript>

            <main className="screen" key={JSON.stringify(screen)}>
              {restored && screen.name !== "welcome" && screen.name !== "thanks" && (
                <div className="restored-note">
                  <Note
                    type="secondary"
                    label={false}
                    action={
                      <Button
                        size="small"
                        variant="ghost"
                        type="primary"
                        onClick={startOver}
                      >
                        {t.draft.startOver}
                      </Button>
                    }
                  >
                    {t.draft.restored}
                  </Note>
                </div>
              )}

              {notice && (
                <div role="alert" className="restored-note">
                  <Note type="warning">{notice}</Note>
                </div>
              )}

              {screen.name === "welcome" && (
                <Welcome
                  headingRef={headingRef}
                  onStart={() => go(nextScreen(screen))}
                />
              )}
              {screen.name === "screening" && (
                <Screening headingRef={headingRef} describedBy={stepCounterId} />
              )}
              {(screen.name === "ineligible" || screen.name === "declined") && (
                <ExitScreen
                  headingRef={headingRef}
                  reason={screen.name}
                  onBack={handlePrevious}
                />
              )}
              {screen.name === "audience" && (
                <AudienceChoice
                  headingRef={headingRef}
                  describedBy={stepCounterId}
                />
              )}
              {screen.name === "questions" && audience && (
                <QuestionStep
                  headingRef={headingRef}
                  describedBy={stepCounterId}
                  step={stepsByAudience[audience][screen.step]}
                />
              )}
              {isReview && (
                <Review
                  headingRef={headingRef}
                  describedBy={stepCounterId}
                  audience={audience}
                  answers={answers ?? {}}
                  onEdit={editStep}
                >
                  {/* Honeypot: out of sight and out of the tab order for people. */}
                  <div className="honeypot" aria-hidden="true">
                    <label>
                      Company website
                      <input
                        {...form.register("company_website")}
                        tabIndex={-1}
                        autoComplete="off"
                      />
                    </label>
                  </div>

                  {submit.status === "failed" && (
                    <div role="alert" className="submit-error">
                      <Note type="danger">{t.submit[submit.failure]}</Note>
                    </div>
                  )}
                  <div role="status" className="sr-only">
                    {submit.status === "submitting" ? t.submit.sending : ""}
                  </div>
                  <div className="step-nav">
                    <Button
                      variant="ghost"
                      type="primary"
                      onClick={handlePrevious}
                      data-edge="start"
                      disabled={submit.status === "submitting"}
                    >
                      {t.common.previous}
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      // Kitchn's spinner adds an English "Loading" to the name.
                      aria-label={
                        submit.status === "submitting"
                          ? t.submit.sending
                          : undefined
                      }
                      loading={submit.status === "submitting"}
                      disabled={submit.status === "submitting"}
                    >
                      {submit.status === "failed"
                        ? t.submit.retry
                        : t.review.submit}
                    </Button>
                  </div>
                </Review>
              )}
              {screen.name === "thanks" && (
                <Thanks
                  headingRef={headingRef}
                  audience={lastSubmission.audience}
                  optedIn={lastSubmission.optedIn}
                  onOtherSurvey={startOtherSurvey}
                />
              )}

              {showsNav && (
                <>
                  {errorCount > 0 && !notice && (
                    <p role="alert" className="step-errors">
                      {t.question.stepErrors(errorCount)}
                    </p>
                  )}
                  <div className="step-nav">
                    <Button
                      variant="ghost"
                      type="primary"
                      data-edge="start"
                      onClick={handlePrevious}
                    >
                      {t.common.previous}
                    </Button>
                    <Button onClick={handleNext}>
                      {returnToReview ? t.review.backToReview : t.common.next}
                    </Button>
                  </div>
                </>
              )}
            </main>
          </div>

          <aside
            className={fullBleed ? "mosaic-panel is-showcase" : "mosaic-panel"}
            aria-hidden="true"
          >
            <Mosaic
              fraction={fullBleed ? 1 : completedFraction(screen)}
            />
          </aside>
        </div>
      </FormProvider>
    </LocaleProvider>
  );
}
