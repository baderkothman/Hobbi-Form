// Holds the survey to its source documents: if the CSV or the generated config
// drift apart, or a question goes missing from the flow, this fails.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  parseOptionLabel,
  parseQuestionsCsv,
} from "../../scripts/parse-questions.mjs";
import { getQuestion, questionsFor, stepsByAudience } from "./config";
import { questions } from "./questions.generated";

const csv = readFileSync(resolve("Hobbi_Survey_Questions.csv"), "utf8");
const markdown = readFileSync(resolve("Hobbi_Market_Research_Survey.md"), "utf8");

describe("question config", () => {
  it("is up to date with the CSV", () => {
    expect(questions).toEqual(parseQuestionsCsv(csv));
  });

  it("has all 17 Explorer and 23 Club questions, in order", () => {
    const ids = (prefix: string, count: number) =>
      Array.from(
        { length: count },
        (_, i) => `${prefix}${String(i + 1).padStart(2, "0")}`,
      );
    expect(questionsFor("explorer").map((q) => q.id)).toEqual(ids("E", 17));
    expect(questionsFor("club").map((q) => q.id)).toEqual(ids("C", 23));
  });

  it("puts every question in exactly one step", () => {
    const placed = Object.values(stepsByAudience).flatMap((steps) =>
      steps.flatMap((step) => step.questionIds),
    );
    expect(new Set(placed).size).toBe(40);
    expect(placed).toHaveLength(40);
  });

  it("matches the wording and answer options in the survey document", () => {
    for (const question of questions) {
      expect(markdown).toContain(`### ${question.id}. ${question.prompt.en}`);
      expect(markdown).toContain(question.prompt.ar);
      if (question.type === "mc" || question.type === "checkbox") {
        for (const option of question.options) {
          // Untranslated options appear in the document once, without a slash.
          const line =
            option.label.en === option.label.ar
              ? `- ${option.label.en}`
              : `- ${option.label.en} / ${option.label.ar}`;
          expect(markdown).toContain(line);
        }
      }
    }
  });

  it("keeps selection limits and required flags from the document", () => {
    const limited = questions.filter(
      (q) => q.type === "checkbox" && q.maxSelections === 3,
    );
    expect(limited.map((q) => q.id)).toEqual([
      "E03", "E04", "E05", "E12", "E13", "C07", "C11", "C17",
    ]);
    expect(questions.filter((q) => !q.required).map((q) => q.id)).toEqual([
      "E15", "E17", "C20", "C21", "C23",
    ]);
    expect(questions.filter((q) => q.type === "scale").map((q) => q.id)).toEqual([
      "E08", "E14", "C14", "C18",
    ]);
  });

  it("gives every option a unique, language-independent value", () => {
    expect(getQuestion("E02")).toMatchObject({
      options: expect.arrayContaining([
        expect.objectContaining({ value: "7_plus" }),
      ]),
    });
    expect(getQuestion("E06")).toMatchObject({
      options: expect.arrayContaining([
        expect.objectContaining({ value: "below_10" }),
      ]),
    });
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

  it("splits an option with slashes inside each language", () => {
    expect(
      parseOptionLabel("Unsure / prefer not to say / غير متأكد / أفضل عدم الإجابة"),
    ).toEqual({
      en: "Unsure / prefer not to say",
      ar: "غير متأكد / أفضل عدم الإجابة",
    });
  });
});
