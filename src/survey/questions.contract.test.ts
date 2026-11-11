// Holds the app to the v2 survey documents: if the CSV, the generated config, the
// survey document or the Google Form script drift apart, this fails.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  parseOptionLabel,
  parseQuestionsCsv,
} from "../../scripts/parse-questions.mjs";
import { getQuestion, questionsFor, stepsByAudience } from "./config";
import { questions } from "./questions.generated";

const csv = readFileSync(resolve("survey-v2/Hobbi_Survey_Questions_v2.csv"), "utf8");
const markdown = readFileSync(
  resolve("survey-v2/Hobbi_Market_Research_Survey_v2.md"),
  "utf8",
);
const appsScript = readFileSync(resolve("survey-v2/build-google-form.gs"), "utf8");

type FormQuestion = {
  id: string;
  en: string;
  ar: string;
  required: boolean;
  maxSelections?: number;
  options?: { en: string; ar: string }[];
  branch?: Record<string, string>;
};
type FormPage = { id: string; questions: FormQuestion[] };

const formSurvey: { pages: FormPage[] } = JSON.parse(
  appsScript.slice(
    appsScript.indexOf("const SURVEY = ") + "const SURVEY = ".length,
    appsScript.indexOf(";\n\nfunction buildHobbiSurvey"),
  ),
);
const formQuestions = formSurvey.pages.flatMap((page) =>
  page.questions.map((question) => ({ ...question, pageId: page.id })),
);
const label = (option: { en: string; ar: string }) =>
  option.en === option.ar ? option.en : `${option.en} / ${option.ar}`;

const EXPLORER_IDS = [
  "E01", "E01a", "E01b", "E02", "E20", "E03", "E04", "E05", "E06", "E07",
  "E09", "E10", "E18", "E19", "E12", "E13", "E15", "E21", "E22", "E16",
  "E17", "E23", "E24",
];
const CLUB_IDS = [
  "C01", "C01a", "C01b", "C24", "C02", "C03", "C25", "C26", "C27", "C28",
  "C29", "C05", "C06", "C07", "C08", "C09", "C11", "C12", "C15", "C16",
  "C17", "C20", "C21", "C13", "C30", "C22", "C23",
];

describe("question config", () => {
  it("is up to date with the CSV", () => {
    expect(questions).toEqual(parseQuestionsCsv(csv));
  });

  it("asks the v2 questions, in the same order as the Google Form", () => {
    expect(questionsFor("explorer").map((q) => q.id)).toEqual(EXPLORER_IDS);
    expect(questionsFor("club").map((q) => q.id)).toEqual(CLUB_IDS);
    expect(questions.map((q) => q.id)).toEqual([...EXPLORER_IDS, ...CLUB_IDS]);
  });

  it("never reuses a removed v1 ID", () => {
    const removed = ["E08", "E11", "E14", "C04", "C10", "C14", "C18", "C19"];
    for (const id of removed) expect(() => getQuestion(id)).toThrow();
  });

  it("puts every question in exactly one step", () => {
    const placed = Object.values(stepsByAudience).flatMap((steps) =>
      steps.flatMap((step) => step.questionIds),
    );
    expect(placed).toHaveLength(questions.length);
    expect(new Set(placed).size).toBe(questions.length);
  });

  it("matches the wording and answer options in the survey document", () => {
    for (const question of questions) {
      expect(markdown).toContain(`### ${question.id}. ${question.prompt.en}`);
      expect(markdown).toContain(question.prompt.ar);
      if (question.type === "mc" || question.type === "checkbox") {
        for (const option of question.options) {
          expect(markdown).toContain(`- ${label(option.label)}`);
        }
      }
    }
  });

  it("keeps selection limits and required flags", () => {
    const limited = questions.filter(
      (q) => q.type === "checkbox" && q.maxSelections === 3,
    );
    expect(limited.map((q) => q.id)).toEqual([
      "E03", "E04", "E05", "E12", "E13", "C07", "C11", "C17",
    ]);
    expect(questions.filter((q) => !q.required).map((q) => q.id)).toEqual([
      "E15", "E22", "E17", "E23", "E24", "C25", "C26", "C20", "C21", "C30", "C23",
    ]);
  });

  it("only shows contact fields after their own opt-in", () => {
    const optIns = Object.fromEntries(
      questions
        .filter((q) => q.type === "text" && q.validation)
        .map((q) => [q.id, q.showIf]),
    );
    expect(optIns).toEqual({
      E22: { question: "E21", when: "in", values: ["yes_invite_me"] },
      E17: { question: "E16", when: "in", values: ["yes_i_opt_in"] },
      C30: { question: "C13", when: "in", values: ["yes", "maybe_tell_me_more"] },
      C23: { question: "C22", when: "in", values: ["yes_i_opt_in"] },
    });
  });

  it("gives every option a unique, language-independent value", () => {
    expect(getQuestion("E02")).toMatchObject({
      options: expect.arrayContaining([
        expect.objectContaining({ value: "7_plus" }),
      ]),
    });
    expect(getQuestion("C15")).toMatchObject({
      options: expect.arrayContaining([
        expect.objectContaining({ value: "0_we_don_t_pay" }),
      ]),
    });
  });
});

describe("Google Form script", () => {
  it("asks the same questions with the same wording and options", () => {
    const fromForm = formQuestions.filter((q) => !q.id.startsWith("S"));
    expect(fromForm.map((q) => q.id)).toEqual(questions.map((q) => q.id));
    for (const question of questions) {
      const form = fromForm.find((q) => q.id === question.id)!;
      expect(form.en).toBe(question.prompt.en);
      expect(form.ar).toBe(question.prompt.ar);
      expect(form.required).toBe(question.required);
      if (question.type === "mc" || question.type === "checkbox") {
        expect(form.options!.map(label)).toEqual(
          question.options.map((option) => label(option.label)),
        );
        expect(form.maxSelections).toBe(
          question.type === "checkbox" ? question.maxSelections : undefined,
        );
      }
    }
  });

  it("routes to each conditional question exactly when the app shows it", () => {
    for (const question of questions.filter((q) => q.showIf)) {
      const rule = question.showIf!;
      const parent = formQuestions.find((q) => q.id === rule.question)!;
      const page = formQuestions.find((q) => q.id === question.id)!.pageId;
      const appParent = getQuestion(rule.question);
      if (appParent.type !== "mc") throw new Error("Routing needs a choice question");

      appParent.options.forEach((option, index) => {
        const destination =
          parent.branch![parent.options![index].en] ?? parent.branch!["*"];
        const shownInApp =
          rule.when === "in"
            ? rule.values.includes(option.value)
            : !rule.values.includes(option.value);
        expect(destination === page, `${question.id} after ${option.value}`).toBe(
          shownInApp,
        );
      });
    }
  });
});

describe("parseOptionLabel", () => {
  it("handles a normal bilingual option", () => {
    expect(parseOptionLabel("Beirut / بيروت")).toEqual({
      en: "Beirut",
      ar: "بيروت",
    });
  });

  it("repeats an option with no translation", () => {
    expect(parseOptionLabel("1–10")).toEqual({ en: "1–10", ar: "1–10" });
  });

  it("keeps an Arabic side that has no Arabic letters", () => {
    expect(parseOptionLabel("$10–19 / 10–19$")).toEqual({
      en: "$10–19",
      ar: "10–19$",
    });
  });

  it("keeps a slash inside a word", () => {
    expect(
      parseOptionLabel("Club Instagram/Facebook pages / صفحات الأندية على إنستغرام أو فيسبوك"),
    ).toEqual({
      en: "Club Instagram/Facebook pages",
      ar: "صفحات الأندية على إنستغرام أو فيسبوك",
    });
  });

  it("splits an option with slashes inside each language", () => {
    expect(
      parseOptionLabel("Unsure / prefer not to say / غير متأكد / أفضل عدم الإجابة"),
    ).toEqual({
      en: "Unsure / prefer not to say",
      ar: "غير متأكد / أفضل عدم الإجابة",
    });
  });
});
