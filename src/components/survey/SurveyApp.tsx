"use client";

// Owns the survey's state: the current screen, the language, the form and the
// submission. What each screen renders lives in screens.tsx and fields.tsx.
import { useCallback, useEffect, useRef, useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";

import { Button, Note } from "@/components/ui/kitchn";
import { messages } from "@/i18n/messages";
import {
  getQuestion,
  isContactQuestion,
  isShownTo,
  pagesFor,
  questionsFor,
} from "@/survey/config";
import {
  afterAge,
  afterConsent,
  completedFraction,
  firstPageOfSection,
  firstQuestionScreen,
  nextScreen,
  pageOf,
  previousScreen,
  progress,
  type Screen,
} from "@/survey/flow";
import {
  answerField,
  emptyValues,
  surveyResolver,
  type SurveyValues,
} from "@/survey/form";
import { directionFor, isLocale, type Locale } from "@/survey/types";

import { clearDraft, loadDraft, saveDraft } from "./draft";
import { LocaleProvider } from "./locale-context";
import { Mosaic } from "./Mosaic";
import {
  AudienceChoice,
  ExitScreen,
  QuestionPageView,
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
    adult: boolean;
  }>({ optedIn: false, adult: true });

  const submissionId = useRef<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const hasNavigated = useRef(false);

  const form = useForm<SurveyValues>({
    resolver: surveyResolver,
    defaultValues: emptyValues(),
    shouldFocusError: false,
  });
  const audience = useWatch({ control: form.control, name: "audience" });
  const answers = useWatch({ control: form.control, name: "answers" });
  const minor = useWatch({ control: form.control, name: "adult" }) === "no";

  const t = messages[locale];

  const syncLocale = useCallback((next: Locale) => {
    setLocale(next);
    document.documentElement.lang = next;
    document.documentElement.dir = directionFor(next);
    document.title = messages[next].meta.title;
  }, []);

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
      const pathLocale = window.location.pathname.split("/")[1];
      if (isLocale(pathLocale)) syncLocale(pathLocale);
      hasNavigated.current = true;
      setNotice(null);
      setSubmit({ status: "idle" });
      // A finished survey stays finished: Back must not reopen a sent response.
      setScreen((current) => (current.name === "thanks" ? current : target));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [syncLocale]);

  // Every screen change starts at the top with focus on the new heading.
  useEffect(() => {
    if (!hasNavigated.current) return;
    window.scrollTo(0, 0);
    // A lone question renders its own h1, so look the heading up in the page.
    (headingRef.current ?? document.querySelector<HTMLElement>("main h1"))?.focus({
      preventScroll: true,
    });
  }, [screen]);

  // Keep the draft current on every change, while there is something to keep.
  useEffect(() => {
    if (!["age", "consent", "audience", "questions", "review"].includes(screen.name)) {
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
    syncLocale(next);
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

  const pageQuestions = (page: number) =>
    audience
      ? pagesFor(audience)[page].questionIds.filter((id) =>
          isShownTo(id, form.getValues("answers"), minor),
        )
      : [];

  const handleNext = async () => {
    if (screen.name === "age" || screen.name === "consent") {
      const field = screen.name === "age" ? "adult" : "consent";
      if (!(await validateAndFocus([{ field, focusId: field }]))) return;
      if (screen.name === "age") {
        go(afterAge());
        return;
      }
      const next = afterConsent(form.getValues("consent")!, minor, form.getValues("answers"));
      // Someone who declines leaves nothing behind on the device.
      if (next.name === "declined") clearDraft();
      // Under-18s can only be explorers, so the audience is set for them.
      if (minor && next.name !== "declined") form.setValue("audience", "explorer");
      go(next);
      return;
    }
    if (screen.name === "audience") {
      const valid = await validateAndFocus([
        { field: "audience", focusId: "audience" },
      ]);
      if (valid) go(nextScreen(screen, audience, form.getValues("answers"), minor));
      return;
    }
    if (screen.name === "questions" && audience) {
      const valid = await validateAndFocus(
        pageQuestions(screen.page).map((id) => ({
          field: answerField(id),
          focusId: id,
        })),
      );
      if (!valid) return;
      // An edit can reveal a new follow-up, such as E01a after changing E01 to
      // Tripoli. That page comes next before returning to the review.
      const next = nextScreen(screen, audience, form.getValues("answers"), minor);
      const nextIsUnanswered =
        next.name === "questions" &&
        pageQuestions(next.page).some((id) => {
          const value = form.getValues("answers")[id];
          return getQuestion(id).required && (value === undefined || value === "");
        });
      if (returnToReview && !nextIsUnanswered) {
        setReturnToReview(false);
        go({ name: "review" });
      } else {
        go(next);
      }
    }
  };

  const handlePrevious = () => {
    setReturnToReview(false);
    go(previousScreen(screen, audience, form.getValues("answers"), minor));
  };

  const editSection = (section: number) => {
    if (!audience) return;
    setReturnToReview(true);
    go({
      name: "questions",
      page: firstPageOfSection(audience, section, form.getValues("answers"), minor),
    });
  };

  const openQuestionForFixing = (questionId: string) => {
    if (!audience) return;
    const page = pageOf(audience, questionId);
    if (page === -1) return;
    setReturnToReview(true);
    go({ name: "questions", page });
    setNotice(t.review.invalid);
    window.setTimeout(() => focusQuestion(questionId), 0);
  };

  const handleSubmit = async () => {
    if (submit.status === "submitting") return;

    // Back, Forward or a restored draft can skip steps, so check everything.
    const values = form.getValues();
    if (!values.adult || (values.adult === "no" && audience === "club")) {
      go({ name: "age" });
      setNotice(t.review.screeningInvalid);
      return;
    }
    if (values.consent !== "yes") {
      go({ name: "consent" });
      setNotice(t.review.screeningInvalid);
      return;
    }
    if (!audience) return;
    const active = questionsFor(audience).filter((question) =>
      isShownTo(question.id, values.answers, minor),
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
      setLastSubmission({
        audience,
        adult: !minor,
        optedIn: active.some(
          (question) => isContactQuestion(question) && values.answers[question.id],
        ),
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
    const other = lastSubmission.audience === "club" ? "explorer" : "club";
    form.reset({ ...emptyValues(), adult: "yes", consent: "yes", audience: other });
    go(firstQuestionScreen(other));
  };

  const startOver = () => {
    clearDraft();
    submissionId.current = null;
    form.reset(emptyValues());
    setRestored(false);
    setReturnToReview(false);
    go(WELCOME);
  };

  const currentStep = progress(screen, audience, answers ?? {}, minor);
  const isReview = screen.name === "review" && audience;
  const showsNav = currentStep !== null && !isReview;
  const fullBleed = screen.name === "welcome" || screen.name === "thanks";

  // A lone question shows its own error, so the page-level summary is only
  // needed on the one page that holds two questions.
  const errorCount = (() => {
    if (screen.name !== "questions" || !audience) return 0;
    const ids = pagesFor(audience)[screen.page].questionIds.filter((id) =>
      isShownTo(id, answers ?? {}, minor),
    );
    if (ids.length < 2) return 0;
    return ids.filter((id) => form.formState.errors.answers?.[id]).length;
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
              {(screen.name === "age" || screen.name === "consent") && (
                <Screening
                  name={screen.name === "age" ? "adult" : "consent"}
                />
              )}
              {screen.name === "declined" && (
                <ExitScreen headingRef={headingRef} onBack={handlePrevious} />
              )}
              {screen.name === "audience" && (
                <AudienceChoice
                  headingRef={headingRef}
                />
              )}
              {screen.name === "questions" && audience && (
                <QuestionPageView
                  headingRef={headingRef}
                  audience={audience}
                  minor={minor}
                  page={pagesFor(audience)[screen.page]}
                />
              )}
              {isReview && (
                <Review
                  headingRef={headingRef}
                  audience={audience}
                  minor={minor}
                  answers={answers ?? {}}
                  onEdit={editSection}
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
                  // Under-18s can't be club organizers, so there's no other survey.
                  onOtherSurvey={lastSubmission.adult ? startOtherSurvey : undefined}
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
              fraction={fullBleed ? 1 : completedFraction(screen, audience, answers ?? {}, minor)}
            />
          </aside>
        </div>
      </FormProvider>
    </LocaleProvider>
  );
}
