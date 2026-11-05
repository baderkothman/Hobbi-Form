// @vitest-environment jsdom
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { KitchnThemeProvider } from "@/components/ui/kitchn";
import { messages } from "@/i18n/messages";
import { questionsFor, stepsByAudience } from "@/survey/config";
import type { Audience, Locale } from "@/survey/types";

import { SurveyApp } from "./SurveyApp";

const en = messages.en;
const ar = messages.ar;

const fetchMock = vi.fn<typeof fetch>();

function renderSurvey(locale: Locale = "en") {
  const user = userEvent.setup();
  render(
    <KitchnThemeProvider>
      <SurveyApp initialLocale={locale} />
    </KitchnThemeProvider>,
  );
  return user;
}

const clickButton = (user: UserEvent, name: string) =>
  user.click(screen.getByRole("button", { name }));

const question = (id: string) => {
  const element = document.querySelector<HTMLElement>(
    `[data-question-id="${id}"]`,
  );
  if (!element) throw new Error(`Question ${id} isn't on screen`);
  return element;
};

async function passScreening(user: UserEvent) {
  await clickButton(user, en.welcome.start);
  await user.click(screen.getByRole("radio", { name: en.screening.adultYes }));
  await user.click(screen.getByRole("radio", { name: en.screening.consentYes }));
  await clickButton(user, en.common.next);
}

async function chooseAudience(user: UserEvent, audience: Audience) {
  const title =
    audience === "explorer"
      ? en.audience.explorerTitle
      : en.audience.clubTitle;
  await user.click(screen.getByRole("radio", { name: new RegExp(title) }));
  await clickButton(user, en.common.next);
}

/** Answers everything on the current step: first option, no optional text. */
async function answerCurrentStep(user: UserEvent) {
  for (const group of document.querySelectorAll<HTMLElement>(
    "[data-question-id]",
  )) {
    const input = group.querySelector<HTMLInputElement>(
      "input[type=radio], input[type=checkbox]",
    );
    if (input && !group.querySelector("input:checked")) await user.click(input);
  }
}

async function completeQuestions(
  user: UserEvent,
  audience: Audience,
  beforeLastNext?: () => Promise<void>,
) {
  const steps = stepsByAudience[audience];
  for (let i = 0; i < steps.length; i += 1) {
    await screen.findByRole("heading", { level: 1, name: steps[i].title.en });
    await answerCurrentStep(user);
    if (i === steps.length - 1) await beforeLastNext?.();
    await clickButton(user, en.common.next);
  }
  await screen.findByRole("heading", { level: 1, name: en.review.title });
}

const lastBody = () =>
  JSON.parse(fetchMock.mock.calls.at(-1)![1]!.body as string);

beforeEach(() => {
  sessionStorage.clear();
  window.history.replaceState(null, "", "/en");
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(Response.json({ ok: true }, { status: 201 }));
  vi.stubGlobal("fetch", fetchMock);
});

describe("welcome", () => {
  it("states the purpose, duration and privacy terms", () => {
    renderSurvey();
    expect(
      screen.getByRole("heading", { level: 1, name: en.welcome.title }),
    ).toBeInTheDocument();
    expect(screen.getByText("6–9 minutes")).toBeInTheDocument();
    expect(screen.getByText("8–11 minutes")).toBeInTheDocument();
    expect(screen.getByText(/No account or login/)).toBeInTheDocument();
    expect(screen.getByText(/isn't a signup/)).toBeInTheDocument();
  });
});

describe("eligibility and consent", () => {
  const startScreening = async () => {
    const user = renderSurvey();
    await clickButton(user, en.welcome.start);
    return user;
  };

  it("requires both answers before continuing", async () => {
    const user = await startScreening();
    await clickButton(user, en.common.next);

    expect(screen.getAllByText(en.errors.required)).toHaveLength(2);
    expect(screen.getByRole("alert")).toHaveTextContent(
      en.question.stepErrors(2),
    );
    expect(
      screen.getByRole("heading", { name: en.screening.title }),
    ).toBeInTheDocument();
  });

  it("moves focus to the first unanswered question", async () => {
    const user = await startScreening();
    await clickButton(user, en.common.next);
    await waitFor(() =>
      expect(screen.getByRole("radio", { name: en.screening.adultYes })).toHaveFocus(),
    );
  });

  it("ends the survey politely for anyone under 18", async () => {
    const user = await startScreening();
    await user.click(screen.getByRole("radio", { name: en.screening.adultNo }));
    await user.click(screen.getByRole("radio", { name: en.screening.consentYes }));
    await clickButton(user, en.common.next);

    expect(
      await screen.findByRole("heading", { name: en.exit.ineligibleTitle }),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sessionStorage.length).toBe(0);
  });

  it("ends the survey politely when consent is declined, and allows changing the answer", async () => {
    const user = await startScreening();
    await user.click(screen.getByRole("radio", { name: en.screening.adultYes }));
    await user.click(screen.getByRole("radio", { name: en.screening.consentNo }));
    await clickButton(user, en.common.next);

    expect(
      await screen.findByRole("heading", { name: en.exit.declinedTitle }),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sessionStorage.length).toBe(0);

    await clickButton(user, en.exit.back);
    expect(
      await screen.findByRole("heading", { name: en.screening.title }),
    ).toBeInTheDocument();
  });

  it("continues to audience selection after an adult consents", async () => {
    const user = renderSurvey();
    await passScreening(user);
    expect(
      await screen.findByRole("heading", { name: en.audience.title }),
    ).toBeInTheDocument();
  });
});

describe("audience routing", () => {
  it("requires a choice", async () => {
    const user = renderSurvey();
    await passScreening(user);
    await clickButton(user, en.common.next);
    expect(screen.getByText(en.errors.required)).toBeInTheDocument();
  });

  it.each([
    ["explorer", "E", 17],
    ["club", "C", 23],
  ] as const)("shows only %s questions", async (audience, prefix, total) => {
    const user = renderSurvey();
    await passScreening(user);
    await chooseAudience(user, audience);

    const seen = new Set<string>();
    for (const step of stepsByAudience[audience]) {
      await screen.findByRole("heading", { level: 1, name: step.title.en });
      await answerCurrentStep(user);
      for (const element of document.querySelectorAll<HTMLElement>(
        "[data-question-id]",
      )) {
        seen.add(element.dataset.questionId!);
      }
      await clickButton(user, en.common.next);
    }

    // Answering with first options opts in, so the contact question appears too.
    expect([...seen].every((id) => id.startsWith(prefix))).toBe(true);
    expect(seen.size).toBe(total);
  });

  it("submits only the current audience's answers after switching", async () => {
    const user = renderSurvey();
    await passScreening(user);
    await chooseAudience(user, "club");
    await answerCurrentStep(user);

    await clickButton(user, en.common.previous);
    await chooseAudience(user, "explorer");
    await completeQuestions(user, "explorer");
    await clickButton(user, en.review.submit);

    await screen.findByRole("heading", { name: en.thanks.title });
    const body = lastBody();
    expect(body.audience).toBe("explorer");
    expect(Object.keys(body.answers).every((id) => id.startsWith("E"))).toBe(true);
  });
});

describe("validation", () => {
  const toFirstExplorerStep = async () => {
    const user = renderSurvey();
    await passScreening(user);
    await chooseAudience(user, "explorer");
    return user;
  };

  it("blocks Next and marks each unanswered question", async () => {
    const user = await toFirstExplorerStep();
    await clickButton(user, en.common.next);

    for (const id of ["E01", "E02", "E03"]) {
      expect(within(question(id)).getByText(en.errors.required)).toBeInTheDocument();
    }
    expect(screen.getByRole("radiogroup", { name: /Where do you usually/ })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(
      screen.getByRole("heading", { name: stepsByAudience.explorer[0].title.en }),
    ).toBeInTheDocument();
  });

  it("clears an error as soon as it's fixed", async () => {
    const user = await toFirstExplorerStep();
    await clickButton(user, en.common.next);
    await user.click(within(question("E01")).getByRole("radio", { name: "Beirut" }));

    await waitFor(() =>
      expect(within(question("E01")).queryByText(en.errors.required)).toBeNull(),
    );
    expect(within(question("E02")).getByText(en.errors.required)).toBeInTheDocument();
  });

  it("enforces the selection limit and explains it", async () => {
    const user = await toFirstExplorerStep();
    const group = within(question("E03"));

    await user.click(group.getByRole("checkbox", { name: "Instagram" }));
    await user.click(group.getByRole("checkbox", { name: "WhatsApp" }));
    await user.click(group.getByRole("checkbox", { name: "Facebook" }));
    expect(group.getByText(en.question.selectedCount(3, 3))).toBeInTheDocument();

    await user.click(group.getByRole("checkbox", { name: "TikTok" }));
    expect(group.getByRole("checkbox", { name: "TikTok" })).not.toBeChecked();
    expect(group.getByText(en.question.limitReached(3))).toBeInTheDocument();

    await user.click(group.getByRole("checkbox", { name: "Facebook" }));
    await user.click(group.getByRole("checkbox", { name: "TikTok" }));
    expect(group.getByRole("checkbox", { name: "TikTok" })).toBeChecked();
  });

  it("exposes each checkbox once, without Kitchn's duplicate role", async () => {
    const user = await toFirstExplorerStep();
    const group = question("E03");
    expect(within(group).getAllByRole("checkbox")).toHaveLength(8);
    expect(group.querySelector("label")).not.toHaveAttribute("role");
    expect(group.querySelector("label")).not.toHaveAttribute("aria-checked");
    await user.tab();
  });

  it("preserves answers when moving between steps", async () => {
    const user = await toFirstExplorerStep();
    await answerCurrentStep(user);
    await clickButton(user, en.common.next);
    await screen.findByRole("heading", {
      name: stepsByAudience.explorer[1].title.en,
    });
    await clickButton(user, en.common.previous);
    await screen.findByRole("heading", {
      name: stepsByAudience.explorer[0].title.en,
    });

    expect(within(question("E01")).getByRole("radio", { name: "Beirut" })).toBeChecked();
    expect(within(question("E03")).getByRole("checkbox", { name: "Instagram" })).toBeChecked();
  });
});

describe("contact details", () => {
  const toContactStep = async () => {
    const user = renderSurvey();
    await passScreening(user);
    await chooseAudience(user, "explorer");
    for (const step of stepsByAudience.explorer.slice(0, 4)) {
      await screen.findByRole("heading", { level: 1, name: step.title.en });
      await answerCurrentStep(user);
      await clickButton(user, en.common.next);
    }
    await screen.findByRole("heading", {
      name: stepsByAudience.explorer[4].title.en,
    });
    return user;
  };
  const contactField = () =>
    screen.getByRole("textbox", { name: /Optional contact if you opted in/ });

  it("shows the contact field only after an opt-in", async () => {
    const user = await toContactStep();
    expect(
      screen.queryByRole("textbox", { name: /Optional contact/ }),
    ).toBeNull();

    await user.click(screen.getByRole("radio", { name: "Yes, I opt in" }));
    expect(contactField()).toBeInTheDocument();
  });

  it("doesn't require contact details after opting in", async () => {
    const user = await toContactStep();
    await user.click(screen.getByRole("radio", { name: "Yes, I opt in" }));
    await clickButton(user, en.common.next);
    expect(
      await screen.findByRole("heading", { name: en.review.title }),
    ).toBeInTheDocument();
  });

  it("flags a contact in the wrong format", async () => {
    const user = await toContactStep();
    await user.click(screen.getByRole("radio", { name: "Yes, I opt in" }));
    await user.type(contactField(), "not valid!");
    await clickButton(user, en.common.next);

    expect(await screen.findByText(en.errors.contact_invalid)).toBeInTheDocument();
    expect(contactField()).toHaveAttribute("aria-invalid", "true");
  });

  it("discards details typed before the opt-in was withdrawn", async () => {
    const user = await toContactStep();
    await user.click(screen.getByRole("radio", { name: "Yes, I opt in" }));
    await user.type(contactField(), "person@example.com");
    await user.click(screen.getByRole("radio", { name: "No" }));
    await clickButton(user, en.common.next);

    await screen.findByRole("heading", { name: en.review.title });
    expect(screen.queryByText("person@example.com")).toBeNull();
    await clickButton(user, en.review.submit);

    await screen.findByRole("heading", { name: en.thanks.title });
    expect(JSON.stringify(lastBody())).not.toContain("person@example.com");
  });

  it("sends details after an opt-in, and never keeps them in the draft", async () => {
    const user = await toContactStep();
    await user.click(screen.getByRole("radio", { name: "Yes, I opt in" }));
    await user.type(contactField(), "person@example.com");
    expect(JSON.stringify({ ...sessionStorage })).not.toContain("person@example.com");

    await clickButton(user, en.common.next);
    await screen.findByRole("heading", { name: en.review.title });
    expect(screen.getByText("person@example.com")).toBeInTheDocument();
    expect(JSON.stringify({ ...sessionStorage })).not.toContain("person@example.com");

    await clickButton(user, en.review.submit);
    await screen.findByRole("heading", { name: en.thanks.title });
    expect(lastBody().answers.E17).toBe("person@example.com");
    expect(screen.getByText(en.thanks.contactOptIn)).toBeInTheDocument();
  });
});

describe("language switching", () => {
  it("renders Arabic right-to-left from the start", async () => {
    const user = renderSurvey("ar");
    expect(
      screen.getByRole("heading", { level: 1, name: ar.welcome.title }),
    ).toBeInTheDocument();
    await clickButton(user, ar.welcome.start);
    expect(
      screen.getByRole("heading", { name: ar.screening.title }),
    ).toBeInTheDocument();
  });

  it("switches direction, URL and title in place", async () => {
    const user = renderSurvey();
    await clickButton(user, en.common.switchLanguage);

    expect(document.documentElement.dir).toBe("rtl");
    expect(document.documentElement.lang).toBe("ar");
    expect(window.location.pathname).toBe("/ar");
    expect(document.title).toBe(ar.meta.title);
    expect(
      screen.getByRole("heading", { level: 1, name: ar.welcome.title }),
    ).toBeInTheDocument();

    await clickButton(user, ar.common.switchLanguage);
    expect(document.documentElement.dir).toBe("ltr");
    expect(window.location.pathname).toBe("/en");
  });

  it("keeps answers and translates questions and errors mid-survey", async () => {
    const user = renderSurvey();
    await passScreening(user);
    await chooseAudience(user, "explorer");
    await user.click(within(question("E01")).getByRole("radio", { name: "Beirut" }));
    await clickButton(user, en.common.next);
    expect(within(question("E02")).getByText(en.errors.required)).toBeInTheDocument();

    await clickButton(user, en.common.switchLanguage);

    expect(screen.getByText("أين تشارك عادةً في الأنشطة؟")).toBeInTheDocument();
    expect(within(question("E01")).getByRole("radio", { name: "بيروت" })).toBeChecked();
    expect(within(question("E02")).getByText(ar.errors.required)).toBeInTheDocument();
  });

  it("records the language in use when submitting", async () => {
    const user = renderSurvey();
    await passScreening(user);
    await chooseAudience(user, "club");
    await completeQuestions(user, "club");
    await clickButton(user, en.common.switchLanguage);
    await clickButton(user, ar.review.submit);
    await screen.findByRole("heading", { name: ar.thanks.title });
    expect(lastBody().locale).toBe("ar");
  });
});

describe("review", () => {
  const toReview = async (audience: Audience = "explorer") => {
    const user = renderSurvey();
    await passScreening(user);
    await chooseAudience(user, audience);
    await completeQuestions(user, audience);
    return user;
  };

  it("lists every question with its answer, marking blanks", async () => {
    await toReview();
    for (const q of questionsFor("explorer")) {
      expect(document.querySelector(`[data-review-id="${q.id}"]`)).not.toBeNull();
    }
    expect(
      within(document.querySelector<HTMLElement>('[data-review-id="E15"]')!).getByText(
        en.review.notAnswered,
      ),
    ).toBeInTheDocument();
  });

  it("leaves out the contact question when nobody opted in", async () => {
    const user = renderSurvey();
    await passScreening(user);
    await chooseAudience(user, "explorer");
    await completeQuestions(user, "explorer", async () => {
      await user.click(screen.getByRole("radio", { name: "No" }));
    });
    expect(document.querySelector('[data-review-id="E16"]')).not.toBeNull();
    expect(document.querySelector('[data-review-id="E17"]')).toBeNull();
  });

  it("edits an answer and returns straight to review", async () => {
    const user = await toReview();
    const title = stepsByAudience.explorer[0].title.en;
    await clickButton(user, en.review.edit(title));

    await screen.findByRole("heading", { level: 1, name: title });
    await user.click(within(question("E01")).getByRole("radio", { name: "Tripoli" }));
    await clickButton(user, en.review.backToReview);

    await screen.findByRole("heading", { level: 1, name: en.review.title });
    expect(
      within(document.querySelector<HTMLElement>('[data-review-id="E01"]')!).getByText("Tripoli"),
    ).toBeInTheDocument();
  });
});

describe("submission", () => {
  const toReview = async () => {
    const user = renderSurvey();
    await passScreening(user);
    await chooseAudience(user, "explorer");
    await completeQuestions(user, "explorer");
    return user;
  };

  it("sends consent and answers, then shows the thank-you screen", async () => {
    const user = await toReview();
    await clickButton(user, en.review.submit);

    expect(
      await screen.findByRole("heading", { name: en.thanks.title }),
    ).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/submissions");
    expect(init?.method).toBe("POST");
    const body = lastBody();
    expect(body.screening).toEqual({ adult: true, consent: true });
    expect(body.audience).toBe("explorer");
    expect(body.locale).toBe("en");
    expect(body.answers.E01).toBe("beirut");
    expect(sessionStorage.length).toBe(0);
  });

  it("shows a loading state and blocks a double submit", async () => {
    let finish!: (response: Response) => void;
    fetchMock.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const user = await toReview();

    await clickButton(user, en.review.submit);
    const button = await screen.findByRole("button", { name: en.submit.sending });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    finish(Response.json({ ok: true }, { status: 201 }));
    await screen.findByRole("heading", { name: en.thanks.title });
  });

  it("keeps answers on a network failure and retries with the same id", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    const user = await toReview();
    await clickButton(user, en.review.submit);

    expect(await screen.findByRole("alert")).toHaveTextContent(en.submit.network);
    const firstId = lastBody().submissionId;
    expect(
      within(document.querySelector<HTMLElement>('[data-review-id="E01"]')!).getByText("Beirut"),
    ).toBeInTheDocument();

    await clickButton(user, en.submit.retry);
    await screen.findByRole("heading", { name: en.thanks.title });
    expect(lastBody().submissionId).toBe(firstId);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    [500, en.submit.server],
    [503, en.submit.server],
    [429, en.submit.rateLimited],
  ])("explains a %i response and offers a retry", async (status, message) => {
    fetchMock.mockResolvedValueOnce(Response.json({ ok: false }, { status }));
    const user = await toReview();
    await clickButton(user, en.review.submit);

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.getByRole("button", { name: en.submit.retry })).toBeEnabled();
  });

  it("takes the person to a field the server rejects", async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ ok: false, code: "invalid", fields: ["E05"] }, { status: 400 }),
    );
    const user = await toReview();
    await clickButton(user, en.review.submit);

    await screen.findByRole("heading", {
      level: 1,
      name: stepsByAudience.explorer[1].title.en,
    });
    expect(within(question("E05")).getByText(en.errors.fallback)).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(en.review.invalid);
  });

  it("offers the other survey to people who are both", async () => {
    const user = await toReview();
    await clickButton(user, en.review.submit);
    await screen.findByRole("heading", { name: en.thanks.title });
    const firstId = lastBody().submissionId;

    await clickButton(user, en.thanks.takeOtherSurvey);
    await screen.findByRole("heading", {
      level: 1,
      name: stepsByAudience.club[0].title.en,
    });
    expect(within(question("C01")).queryByRole("radio", { checked: true })).toBeNull();

    await completeQuestions(user, "club");
    await clickButton(user, en.review.submit);
    await screen.findByRole("heading", { name: en.thanks.title });
    expect(lastBody().audience).toBe("club");
    expect(lastBody().submissionId).not.toBe(firstId);
  });
});

describe("draft", () => {
  it("restores answers and position after a reload", async () => {
    const user = renderSurvey();
    await passScreening(user);
    await chooseAudience(user, "explorer");
    await user.click(within(question("E01")).getByRole("radio", { name: "Tripoli" }));

    document.body.innerHTML = "";
    renderSurvey();

    expect(await screen.findByText(en.draft.restored)).toBeInTheDocument();
    expect(within(question("E01")).getByRole("radio", { name: "Tripoli" })).toBeChecked();
  });

  it("ignores a corrupted draft", async () => {
    sessionStorage.setItem("hobbi-survey-draft-v1", '{"screen":{"name":"thanks"}}');
    renderSurvey();
    expect(
      await screen.findByRole("heading", { name: en.welcome.title }),
    ).toBeInTheDocument();
  });
});
