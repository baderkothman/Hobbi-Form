// Survey behaviour that the CSV does not describe: how questions are grouped
// into steps, and text limits. Which questions depend on earlier answers comes
// from the CSV's "Shown if" column.
import { questions } from "./questions.generated";
import type { Answers, Audience, Localized, Question } from "./types";

/** Bump when questions change, so responses stay attributable to a wording. */
export const SURVEY_VERSION = "2026-11-v2";

export type SurveyStep = {
  id: string;
  title: Localized;
  questionIds: readonly string[];
};

// Sections: they name each page in the progress line and group the review.
export const stepsByAudience: Record<Audience, readonly SurveyStep[]> = {
  explorer: [
    {
      id: "explorer-activities",
      title: { en: "Your activities", ar: "أنشطتك" },
      questionIds: ["E01", "E01a", "E01b", "E02", "E20", "E03"],
    },
    {
      id: "explorer-preferences",
      title: { en: "What you look for", ar: "ما الذي تبحث عنه" },
      questionIds: ["E04", "E05", "E06", "E07"],
    },
    {
      id: "explorer-joining",
      title: { en: "How you like to join", ar: "كيف تحب أن تشارك" },
      questionIds: ["E09", "E10", "E18", "E19"],
    },
    {
      id: "explorer-app",
      title: { en: "An app like Hobbi", ar: "تطبيق مثل Hobbi" },
      questionIds: ["E12", "E13", "E15"],
    },
    {
      id: "explorer-contact",
      title: { en: "Staying in touch", ar: "البقاء على تواصل" },
      questionIds: ["E21", "E22", "E16", "E17", "E23", "E24"],
    },
  ],
  club: [
    {
      id: "club-profile",
      title: { en: "Your club", ar: "ناديكم" },
      questionIds: ["C01", "C01a", "C01b", "C24", "C02", "C03", "C25", "C26"],
    },
    {
      id: "club-payments",
      title: { en: "Payments and promotion", ar: "الدفع والترويج" },
      questionIds: ["C27", "C28", "C29", "C05"],
    },
    {
      id: "club-operations",
      title: { en: "Bookings", ar: "الحجوزات" },
      questionIds: ["C06", "C07", "C08", "C09"],
    },
    {
      id: "club-tools",
      title: { en: "Tools and pricing", ar: "الأدوات والأسعار" },
      questionIds: ["C11", "C12", "C15", "C16", "C17"],
    },
    {
      id: "club-final",
      title: { en: "Final thoughts", ar: "أفكار أخيرة" },
      questionIds: ["C20", "C21", "C13", "C30", "C22", "C23"],
    },
  ],
};

export type QuestionPage = {
  /** Index into stepsByAudience: the section this page belongs to. */
  section: number;
  questionIds: readonly string[];
};

/**
 * Options with short labels sit two to a row on every screen size, which is
 * most of what lets several questions share a page without scrolling.
 */
export function usesTwoColumns(question: Question): boolean {
  if (question.type !== "mc" && question.type !== "checkbox") return false;
  const longest = Math.max(
    ...question.options.flatMap((option) => [option.label.en.length, option.label.ar.length]),
  );
  return question.options.length >= 4 && longest <= 18;
}

/** Screen geometry for estimating page height, taken from the short-screen CSS. */
type ScreenSize = {
  available: number; // Viewport height minus the header, progress line and nav.
  charsPerLine: number; // Heading characters per line.
  titleLine: number; // Line height of a lone question used as the heading.
  promptLine: number; // Line height of a question on a shared page.
  sectionTitle: number; // Section heading plus spacing on a shared page.
  gap: number; // Space between questions on a shared page.
  row: number; // One option row, with its gap.
  denseRow: number; // A row in a single-column list of 9 or more options.
  columnsFrom: number; // Option count from which every list gets two columns.
};

// A 390x844 phone (single column) and a 1280x720 laptop (two columns).
const SCREEN_SIZES: readonly ScreenSize[] = [
  { available: 680, charsPerLine: 30, titleLine: 25, promptLine: 26, sectionTitle: 60, gap: 36, row: 48, denseRow: 39, columnsFrom: Infinity },
  { available: 560, charsPerLine: 46, titleLine: 30, promptLine: 26, sectionTitle: 70, gap: 36, row: 50, denseRow: 46, columnsFrom: 4 },
];

const longest = (texts: string[]) => Math.max(...texts.map((text) => text.length));

function questionHeight(question: Question, size: ScreenSize, alone: boolean): number {
  const lines = Math.ceil(longest([question.prompt.en, question.prompt.ar]) / size.charsPerLine);
  let height = alone ? lines * size.titleLine + 6 : lines * size.promptLine + 12;
  if (question.hint) {
    const hintLines = Math.ceil(
      longest([question.hint.en, question.hint.ar]) / (size.charsPerLine * 1.4),
    );
    height += hintLines * 20 + 10;
  }
  switch (question.type) {
    case "mc":
    case "checkbox": {
      const count = question.options.length;
      const twoColumns = usesTwoColumns(question) || count >= size.columnsFrom;
      const rows = twoColumns ? Math.ceil(count / 2) : count;
      height += rows * (count >= 9 && !twoColumns ? size.denseRow : size.row);
      if (question.type === "checkbox" && question.maxSelections) height += 26;
      return height;
    }
    case "scale":
      return height + 80;
    case "paragraph":
      return height + 190;
    case "text":
    case "number":
      return height + 56;
  }
}

/** Whether these questions fit on one screen of both a phone and a laptop. */
function fitsOnScreen(questionIds: readonly string[]): boolean {
  const questions = questionIds.map(getQuestion);
  return SCREEN_SIZES.every((size) => {
    const height =
      questions.length === 1
        ? questionHeight(questions[0], size, true)
        : size.sectionTitle +
          questions.reduce((sum, q) => sum + questionHeight(q, size, false), 0) +
          size.gap * (questions.length - 1);
    return height <= size.available;
  });
}

/**
 * Packs each section into as few pages as fit without scrolling. Two rules:
 *  - a question that decides what comes next is alone on its page, and its
 *    follow-up starts the next one;
 *  - follow-ups of the same question share a page (E01a and E01b: only one
 *    of them ever shows).
 * The browser tests check that every page really fits on phone and laptop.
 */
/** Questions that read as one and are never split across pages. */
const KEPT_TOGETHER: readonly (readonly string[])[] = [["C25", "C26"]];

function packSection(questionIds: readonly string[]): string[][] {
  const pages: string[][] = [];
  let current: string[] = [];
  const flush = () => {
    if (current.length > 0) pages.push(current);
    current = [];
  };

  for (let i = 0; i < questionIds.length; i += 1) {
    const question = getQuestion(questionIds[i]);
    if (dependentsOf(question.id).length > 0) {
      flush();
      pages.push([question.id]);
      continue;
    }
    if (question.showIf) {
      flush();
      const siblings = [question.id];
      while (
        i + 1 < questionIds.length &&
        getQuestion(questionIds[i + 1]).showIf?.question === question.showIf.question
      ) {
        siblings.push(questionIds[(i += 1)]);
      }
      pages.push(siblings);
      continue;
    }
    const group = KEPT_TOGETHER.find((ids) => ids[0] === question.id) ?? [question.id];
    if (!fitsOnScreen([...current, ...group])) flush();
    current.push(...group);
    i += group.length - 1;
  }
  flush();
  return pages;
}

const pageCache = new Map<Audience, readonly QuestionPage[]>();

export function pagesFor(audience: Audience): readonly QuestionPage[] {
  let pages = pageCache.get(audience);
  if (!pages) {
    pages = stepsByAudience[audience].flatMap((step, section) =>
      packSection(step.questionIds).map((questionIds) => ({ section, questionIds })),
    );
    pageCache.set(audience, pages);
  }
  return pages;
}

/**
 * Questions people under 18 never see: E23's age ranges start at 18, and no
 * contact details are collected from minors, so the launch invite (E21, E22)
 * and the interview opt-in (E16, E17) are left out for them.
 */
export const ADULT_ONLY_QUESTIONS: readonly string[] = ["E21", "E22", "E16", "E17", "E23"];

/** Routing visibility, plus what's never shown to someone under 18. */
export function isShownTo(id: string, answers: Answers, minor: boolean): boolean {
  return isQuestionVisible(id, answers) && !(minor && ADULT_ONLY_QUESTIONS.includes(id));
}

export const MAX_PARAGRAPH_LENGTH = 1000;
export const MAX_TEXT_LENGTH = 120;
export const MAX_COUNT = 100_000;

const byId = new Map(questions.map((question) => [question.id, question]));

export function getQuestion(id: string): Question {
  const question = byId.get(id);
  if (!question) throw new Error(`Unknown survey question: ${id}`);
  return question;
}

export function questionsFor(audience: Audience): Question[] {
  return stepsByAudience[audience].flatMap((step) =>
    step.questionIds.map(getQuestion),
  );
}

/**
 * Contact fields: shown only after their own opt-in ("Shown if"), and stored
 * apart from the answers so research exports carry no contact data.
 */
export function isContactQuestion(question: Question): boolean {
  return question.type === "text" && question.validation !== undefined;
}

export function contactQuestionIds(audience: Audience): string[] {
  return questionsFor(audience).filter(isContactQuestion).map((q) => q.id);
}

/** "notIn" needs an answer: E01b stays hidden until E01 is answered. */
export function isQuestionVisible(id: string, answers: Answers): boolean {
  const rule = byId.get(id)?.showIf;
  if (!rule) return true;
  const answer = answers[rule.question];
  if (typeof answer !== "string" || !isQuestionVisible(rule.question, answers)) {
    return false;
  }
  return rule.when === "in"
    ? rule.values.includes(answer)
    : !rule.values.includes(answer);
}

/** Questions whose visibility depends on this one. */
export function dependentsOf(id: string): string[] {
  return questions.filter((q) => q.showIf?.question === id).map((q) => q.id);
}

export function visibleQuestions(
  step: SurveyStep,
  answers: Answers,
): Question[] {
  return step.questionIds
    .filter((id) => isQuestionVisible(id, answers))
    .map(getQuestion);
}
