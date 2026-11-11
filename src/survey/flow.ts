// The survey's navigation as pure functions, so routing can be tested without a
// browser. The rendered app only ever moves between the screens defined here.
import { isShownTo, pagesFor, type QuestionPage } from "./config";
import type { Answers, Audience } from "./types";

export type Screen =
  | { name: "welcome" }
  | { name: "age" }
  | { name: "consent" }
  | { name: "declined" }
  | { name: "audience" }
  | { name: "questions"; page: number }
  | { name: "review" }
  | { name: "thanks" };

export type YesNo = "yes" | "no";

/** Everyone continues to consent: under-18s can take part as explorers. */
export function afterAge(): Screen {
  return { name: "consent" };
}

/**
 * Adults choose explorer or club. People under 18 can't be club organizers,
 * so they skip that choice and go straight to the explorer questions.
 */
export function afterConsent(consent: YesNo, minor: boolean, answers: Answers = {}): Screen {
  if (consent === "no") return { name: "declined" };
  return minor ? firstQuestionScreen("explorer", answers, true) : { name: "audience" };
}

/**
 * A page is skipped when nothing on it applies: routing hides E01a for Beirut,
 * and under-18s never see the contact opt-ins.
 */
export function isPageVisible(page: QuestionPage, answers: Answers, minor = false): boolean {
  return page.questionIds.some((id) => isShownTo(id, answers, minor));
}

function visiblePageIndexes(audience: Audience, answers: Answers, minor: boolean): number[] {
  return pagesFor(audience)
    .map((page, index) => (isPageVisible(page, answers, minor) ? index : -1))
    .filter((index) => index !== -1);
}

export function firstQuestionScreen(
  audience: Audience,
  answers: Answers = {},
  minor = false,
): Screen {
  const [first] = visiblePageIndexes(audience, answers, minor);
  return first === undefined ? { name: "review" } : { name: "questions", page: first };
}

export function nextScreen(
  screen: Screen,
  audience?: Audience,
  answers: Answers = {},
  minor = false,
): Screen {
  switch (screen.name) {
    case "welcome":
      return { name: "age" };
    case "audience":
      return audience ? firstQuestionScreen(audience, answers, minor) : screen;
    case "questions": {
      if (!audience) return { name: "audience" };
      const next = visiblePageIndexes(audience, answers, minor).find((i) => i > screen.page);
      return next === undefined ? { name: "review" } : { name: "questions", page: next };
    }
    default:
      return screen;
  }
}

export function previousScreen(
  screen: Screen,
  audience?: Audience,
  answers: Answers = {},
  minor = false,
): Screen {
  // Under-18s never see the audience page, so going back from the first
  // question returns to consent.
  const beforeQuestions: Screen = minor ? { name: "consent" } : { name: "audience" };
  switch (screen.name) {
    case "age":
      return { name: "welcome" };
    case "consent":
      return { name: "age" };
    case "declined":
    case "audience":
      return { name: "consent" };
    case "questions": {
      if (!audience) return beforeQuestions;
      const previous = visiblePageIndexes(audience, answers, minor)
        .filter((i) => i < screen.page)
        .at(-1);
      return previous === undefined ? beforeQuestions : { name: "questions", page: previous };
    }
    case "review": {
      if (!audience) return beforeQuestions;
      const last = visiblePageIndexes(audience, answers, minor).at(-1);
      return last === undefined ? beforeQuestions : { name: "questions", page: last };
    }
    default:
      return screen;
  }
}

/** The page holding a question, for jumping straight to it from the review. */
export function pageOf(audience: Audience, questionId: string): number {
  return pagesFor(audience).findIndex((page) => page.questionIds.includes(questionId));
}

/** The first page of a section that applies to this respondent. */
export function firstPageOfSection(
  audience: Audience,
  section: number,
  answers: Answers,
  minor = false,
): number {
  return visiblePageIndexes(audience, answers, minor).find(
    (i) => pagesFor(audience)[i].section === section,
  ) ?? pagesFor(audience).findIndex((page) => page.section === section);
}

export type Progress = { current: number; total: number };

/**
 * Age, consent, audience (adults only), each page that applies, then review.
 * The total follows the respondent's answers, so pages routing hides aren't
 * counted. Before an audience is chosen, the explorer path stands in.
 */
export function progress(
  screen: Screen,
  audience: Audience | undefined,
  answers: Answers,
  minor = false,
): Progress | null {
  const pages = visiblePageIndexes(audience ?? "explorer", answers, minor);
  const beforeQuestions = minor ? 2 : 3;
  const total = beforeQuestions + pages.length + 1;
  switch (screen.name) {
    case "age":
      return { current: 1, total };
    case "consent":
      return { current: 2, total };
    case "audience":
      return { current: 3, total };
    case "questions": {
      const position = pages.indexOf(screen.page);
      return { current: beforeQuestions + 1 + Math.max(position, 0), total };
    }
    case "review":
      return { current: total, total };
    default:
      return null;
  }
}

/** Share of the mosaic laid so far: completed steps over all steps. */
export function completedFraction(
  screen: Screen,
  audience: Audience | undefined,
  answers: Answers,
  minor = false,
): number {
  if (screen.name === "thanks") return 1;
  const step = progress(screen, audience, answers, minor);
  return step === null ? 0 : (step.current - 1) / step.total;
}
