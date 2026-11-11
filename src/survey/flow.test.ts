import { describe, expect, it } from "vitest";

import { validAnswers } from "@/test/fixtures";

import {
  dependentsOf,
  getQuestion,
  pagesFor,
  questionsFor,
  stepsByAudience,
} from "./config";
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
} from "./flow";
import { AUDIENCES, type Answers, type Audience } from "./types";

function pageIds(audience: Audience, screen: Screen): readonly string[] {
  if (screen.name !== "questions") throw new Error(`Not a question page: ${screen.name}`);
  return pagesFor(audience)[screen.page].questionIds;
}

/** Every page a respondent with these answers visits, in order. */
function walk(audience: Audience, answers: Answers): string[][] {
  const visited: string[][] = [];
  let screen = firstQuestionScreen(audience, answers);
  while (screen.name === "questions") {
    visited.push([...pageIds(audience, screen)]);
    screen = nextScreen(screen, audience, answers);
  }
  expect(screen.name).toBe("review");
  return visited;
}

describe("pages", () => {
  it.each(AUDIENCES)("puts every %s question on exactly one page", (audience) => {
    const onPages = pagesFor(audience).flatMap((page) => page.questionIds);
    const inSections = stepsByAudience[audience].flatMap((step) => step.questionIds);
    expect(onPages).toEqual(inSections);
  });

  it.each(AUDIENCES)("puts several %s questions on a page where they fit", (audience) => {
    const pages = pagesFor(audience);
    expect(pages.length).toBeLessThan(questionsFor(audience).length - 4);
    expect(pages.some((page) => page.questionIds.length > 1)).toBe(true);
  });

  it.each(AUDIENCES)(
    "keeps every %s question that changes what follows alone on its page",
    (audience) => {
      for (const page of pagesFor(audience)) {
        for (const id of page.questionIds) {
          if (dependentsOf(id).length > 0) expect(page.questionIds, id).toEqual([id]);
        }
      }
    },
  );

  it.each(AUDIENCES)(
    "starts a new page after each %s routing question, shared only by its follow-ups",
    (audience) => {
      for (const page of pagesFor(audience)) {
        const parents = page.questionIds.map((id) => getQuestion(id).showIf?.question);
        if (parents.some(Boolean)) {
          expect(new Set(parents).size, page.questionIds.join()).toBe(1);
        }
      }
    },
  );
});

describe("screening", () => {
  it("asks everyone for consent after age, minors included", () => {
    expect(afterAge().name).toBe("consent");
  });

  it("sends consenting adults to choose an audience", () => {
    expect(afterConsent("yes", false).name).toBe("audience");
  });

  it("sends consenting minors straight to the explorer questions", () => {
    expect(afterConsent("yes", true)).toEqual({ name: "questions", page: 0 });
    expect(pagesFor("explorer")[0].questionIds).toEqual(["E01"]);
  });

  it("ends politely when consent is declined, at any age", () => {
    expect(afterConsent("no", false).name).toBe("declined");
    expect(afterConsent("no", true).name).toBe("declined");
  });

  it("goes back to consent from a minor's first question, and to the audience for adults", () => {
    const first: Screen = { name: "questions", page: 0 };
    expect(previousScreen(first, "explorer", {}, true).name).toBe("consent");
    expect(previousScreen(first, "explorer", {}, false).name).toBe("audience");
    expect(previousScreen({ name: "declined" }).name).toBe("consent");
    expect(previousScreen({ name: "consent" }).name).toBe("age");
    expect(previousScreen({ name: "age" }).name).toBe("welcome");
  });
});

describe("routing", () => {
  it("shows the Tripoli area page only to Tripoli explorers", () => {
    const tripoli = walk("explorer", { ...validAnswers("explorer"), E01: "tripoli" });
    const beirut = walk("explorer", validAnswers("explorer"));
    // E01a and E01b share a page; routing shows exactly one of them, so the
    // test checks the page's visible question through the walk's answers.
    expect(tripoli.slice(0, 3)).toEqual([["E01"], ["E01a", "E01b"], ["E02", "E20"]]);
    expect(beirut.slice(0, 3)).toEqual([["E01"], ["E01a", "E01b"], ["E02", "E20"]]);
    // Until E01 is answered, the follow-up page is skipped.
    expect(walk("explorer", {}).slice(0, 2)).toEqual([["E01"], ["E02", "E20"]]);
  });

  it("skips the contact pages unless the person opts in", () => {
    const declined = walk("explorer", validAnswers("explorer")).flat();
    expect(declined).not.toContain("E22");
    expect(declined).not.toContain("E17");

    const optedIn = walk("explorer", {
      ...validAnswers("explorer"),
      E21: "yes_invite_me",
      E16: "yes_i_opt_in",
    }).flat();
    expect(optedIn.slice(-6)).toEqual(["E21", "E22", "E16", "E17", "E23", "E24"]);
  });

  it("asks clubs about prices only when participants pay", () => {
    const pays = walk("club", { ...validAnswers("club"), C27: "sometimes" }).flat();
    const free = walk("club", { ...validAnswers("club"), C27: "never" }).flat();
    expect(pays).toEqual(expect.arrayContaining(["C28", "C29"]));
    expect(free).not.toContain("C28");
    expect(free).not.toContain("C29");
  });

  it.each(AUDIENCES)("walks back over exactly the %s pages it walked forward", (audience) => {
    const answers = validAnswers(audience);
    const forward: Screen[] = [{ name: "audience" }];
    while (forward.at(-1)!.name !== "review") {
      forward.push(nextScreen(forward.at(-1)!, audience, answers));
    }
    const backward: Screen[] = [{ name: "review" }];
    while (backward.at(-1)!.name !== "audience") {
      backward.push(previousScreen(backward.at(-1)!, audience, answers));
    }
    expect(backward.reverse()).toEqual(forward);
  });

  it("finds the page for a question and the first page of a section", () => {
    // The headcount pair always stays together.
    expect(pageIds("club", { name: "questions", page: pageOf("club", "C26") })).toEqual([
      "C25",
      "C26",
    ]);
    // Section 0 starts at E01, whatever the answers.
    expect(firstPageOfSection("explorer", 0, {})).toBe(0);
  });

  it("leaves the thank-you screen where it is", () => {
    expect(previousScreen({ name: "thanks" }).name).toBe("thanks");
  });
});

describe("progress", () => {
  it("counts age, consent, audience, every page that applies, and review", () => {
    const answers = validAnswers("explorer");
    const pages = walk("explorer", answers).length;
    expect(progress({ name: "age" }, "explorer", answers)).toEqual({ current: 1, total: pages + 4 });
    expect(progress({ name: "audience" }, "explorer", answers)?.current).toBe(3);
    expect(progress(firstQuestionScreen("explorer", answers), "explorer", answers)?.current).toBe(4);
    expect(progress({ name: "review" }, "explorer", answers)).toEqual({
      current: pages + 4,
      total: pages + 4,
    });
    expect(progress({ name: "welcome" }, "explorer", answers)).toBeNull();
  });

  it("grows the total when an opt-in adds a page", () => {
    const base = validAnswers("explorer");
    const without = progress({ name: "age" }, "explorer", base)!.total;
    const withInvite = progress({ name: "age" }, "explorer", {
      ...base,
      E21: "yes_invite_me",
    })!.total;
    expect(withInvite).toBe(without + 1);
  });

  it("leaves the audience choice and contact opt-ins out of a minor's count", () => {
    const answers = validAnswers("explorer");
    const adult = progress({ name: "review" }, "explorer", answers, false)!;
    const minor = progress({ name: "review" }, "explorer", answers, true)!;
    // The audience page, the launch-invite page and the interview page.
    expect(minor.total).toBe(adult.total - 3);
    expect(progress({ name: "questions", page: 0 }, "explorer", answers, true)?.current).toBe(3);
  });

  it("lays the mosaic in step with progress, finishing only at the end", () => {
    const answers = validAnswers("club");
    expect(completedFraction({ name: "age" }, "club", answers)).toBe(0);
    expect(completedFraction({ name: "review" }, "club", answers)).toBeLessThan(1);
    expect(completedFraction({ name: "thanks" }, "club", answers)).toBe(1);
  });
});
