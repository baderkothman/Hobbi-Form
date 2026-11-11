// @vitest-environment jsdom
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { KitchnThemeProvider } from "@/components/ui/kitchn";
import { messages } from "@/i18n/messages";
import { getQuestion, questionsFor, stepsByAudience } from "@/survey/config";
import type { Audience, Locale } from "@/survey/types";

import { SurveyApp } from "./SurveyApp";

const en = messages.en;
const ar = messages.ar;
const prompt = (id: string) => getQuestion(id).prompt.en;

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
  const element = document.querySelector<HTMLElement>(`[data-question-id="${id}"]`);
  if (!element) throw new Error(`Question ${id} isn't on screen`);
  return element;
};
const isOnScreen = (id: string) =>
  document.querySelector(`[data-question-id="${id}"]`) !== null;
const idsOnScreen = () =>
  [...document.querySelectorAll<HTMLElement>("[data-question-id]")].map(
    (element) => element.dataset.questionId!,
  );
const pageHeading = () => screen.getByRole("heading", { level: 1 });

/** Picks the named options, or the first option of anything unanswered. */
async function answerPage(user: UserEvent, choices: Record<string, string> = {}) {
  for (const id of idsOnScreen()) {
    const group = question(id);
    if (choices[id]) {
      await user.click(
        within(group).getByRole(
          group.querySelector("input[type=checkbox]") ? "checkbox" : "radio",
          { name: choices[id] },
        ),
      );
      continue;
    }
    const first = group.querySelector<HTMLInputElement>(
      "input[type=radio], input[type=checkbox]",
    );
    if (first && !group.querySelector("input:checked")) await user.click(first);
  }
}

/** Presses Next and waits for the page to change. */
async function next(user: UserEvent) {
  const before = idsOnScreen().join();
  await clickButton(user, en.common.next);
  await waitFor(() => expect(idsOnScreen().join()).not.toBe(before));
}

/** Answers page after page until a question is on screen. */
async function advanceTo(user: UserEvent, id: string, choices: Record<string, string> = {}) {
  for (let guard = 0; guard < 40 && !isOnScreen(id); guard += 1) {
    await answerPage(user, choices);
    await next(user);
  }
  expect(isOnScreen(id)).toBe(true);
}

/** Answers every remaining page; returns the question IDs seen on the way. */
async function completeQuestions(user: UserEvent, choices: Record<string, string> = {}) {
  const seen: string[][] = [];
  for (let guard = 0; guard < 40 && idsOnScreen().length > 0; guard += 1) {
    seen.push(idsOnScreen());
    await answerPage(user, choices);
    await next(user);
  }
  await screen.findByRole("heading", { level: 1, name: en.review.title });
  return seen;
}

async function passScreening(user: UserEvent) {
  await clickButton(user, en.welcome.start);
  await user.click(screen.getByRole("radio", { name: en.screening.adultYes }));
  await next(user);
  await user.click(screen.getByRole("radio", { name: en.screening.consentYes }));
  await clickButton(user, en.common.next);
  await screen.findByRole("heading", { name: en.audience.title });
}

async function chooseAudience(user: UserEvent, audience: Audience) {
  const title = audience === "explorer" ? en.audience.explorerTitle : en.audience.clubTitle;
  await user.click(screen.getByRole("radio", { name: new RegExp(title) }));
  await next(user);
}

async function startAs(audience: Audience) {
  const user = renderSurvey();
  await passScreening(user);
  await chooseAudience(user, audience);
  return user;
}

async function toReview(audience: Audience, choices: Record<string, string> = {}) {
  const user = await startAs(audience);
  await completeQuestions(user, choices);
  return user;
}

const lastBody = () => JSON.parse(fetchMock.mock.calls.at(-1)![1]!.body as string);
const reviewItem = (id: string) =>
  document.querySelector<HTMLElement>(`[data-review-id="${id}"]`);

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
    expect(screen.getByRole("heading", { level: 1, name: en.welcome.title })).toBeInTheDocument();
    expect(screen.getByText("6–8 minutes")).toBeInTheDocument();
    expect(screen.getByText("8–10 minutes")).toBeInTheDocument();
    expect(screen.getByText(/No account or login/)).toBeInTheDocument();
    expect(screen.getByText(/isn't a signup/)).toBeInTheDocument();
  });
});

describe("eligibility and consent", () => {
  const start = async () => {
    const user = renderSurvey();
    await clickButton(user, en.welcome.start);
    return user;
  };

  it("asks about age on its own page, without saying what each answer leads to", async () => {
    await start();
    expect(pageHeading()).toHaveTextContent(en.screening.adultQuestion);
    expect(screen.queryByText(/explorer|club|adults/i)).toBeNull();
    expect(screen.queryByRole("radio", { name: en.screening.consentYes })).toBeNull();
    expect(screen.getByText(en.screening.intro)).toBeInTheDocument();
  });

  it("requires an answer and moves focus to it", async () => {
    const user = await start();
    await clickButton(user, en.common.next);
    expect(screen.getByText(en.errors.required)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("radio", { name: en.screening.adultYes })).toHaveFocus(),
    );
  });

  it("lets under-18s take the explorer survey, never offering the club one", async () => {
    const user = await start();
    await user.click(screen.getByRole("radio", { name: en.screening.adultNo }));
    await next(user);
    expect(pageHeading()).toHaveTextContent(en.screening.consentQuestion);
    await user.click(screen.getByRole("radio", { name: en.screening.consentYes }));
    await next(user);

    // No audience choice: straight to the first explorer question.
    expect(idsOnScreen()).toEqual(["E01"]);
    const pages = await completeQuestions(user);
    expect(pages.flat()).toContain("E24");
    expect(pages.flat()).not.toContain("E23"); // Its age ranges start at 18.
    // No contact details from minors: no launch invite, no interview opt-in.
    for (const id of ["E21", "E22", "E16", "E17"]) {
      expect(pages.flat()).not.toContain(id);
      expect(reviewItem(id)).toBeNull();
    }
    expect(screen.queryByRole("textbox", { name: /WhatsApp/ })).toBeNull();

    await clickButton(user, en.review.submit);
    await screen.findByRole("heading", { name: en.thanks.title });
    expect(lastBody().screening).toEqual({ adult: false, consent: true });
    expect(lastBody().audience).toBe("explorer");
    expect(Object.keys(lastBody().answers)).not.toContain("E21");
    expect(screen.queryByRole("button", { name: en.thanks.takeOtherSurvey })).toBeNull();
  });

  it("returns a minor from the first question to consent, not the audience choice", async () => {
    const user = await start();
    await user.click(screen.getByRole("radio", { name: en.screening.adultNo }));
    await next(user);
    await user.click(screen.getByRole("radio", { name: en.screening.consentYes }));
    await next(user);
    await clickButton(user, en.common.previous);
    await waitFor(() => expect(pageHeading()).toHaveTextContent(en.screening.consentQuestion));
  });

  it("asks for consent on its own page, ends politely if declined, and allows changing it", async () => {
    const user = await start();
    await user.click(screen.getByRole("radio", { name: en.screening.adultYes }));
    await next(user);
    expect(pageHeading()).toHaveTextContent(en.screening.consentQuestion);

    await user.click(screen.getByRole("radio", { name: en.screening.consentNo }));
    await clickButton(user, en.common.next);
    expect(await screen.findByRole("heading", { name: en.exit.declinedTitle })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sessionStorage.length).toBe(0);

    await clickButton(user, en.exit.back);
    expect(await screen.findByRole("heading", { name: en.screening.consentQuestion })).toBeInTheDocument();
  });

  it("continues to audience selection after an adult consents", async () => {
    const user = renderSurvey();
    await passScreening(user);
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
    ["explorer", "E", 23],
    ["club", "C", 27],
  ] as const)("shows only %s questions, several to a page where they fit", async (audience, prefix, total) => {
    const user = await startAs(audience);
    const pages = await completeQuestions(user);
    const seen = pages.flat();

    expect(seen.every((id) => id.startsWith(prefix))).toBe(true);
    // First options opt in to everything, so every contact field appears, but
    // only one of the two city follow-ups (the city isn't Tripoli).
    expect(new Set(seen).size).toBe(total - 1);
    expect(seen).not.toContain(`${prefix}01a`);
    expect(pages.some((page) => page.length > 1)).toBe(true);
    // Questions that decide what comes next are alone on their page.
    for (const id of audience === "explorer" ? ["E01", "E21", "E16"] : ["C01", "C27", "C13", "C22"]) {
      expect(pages.find((page) => page.includes(id))).toEqual([id]);
    }
  });

  it("submits only the current audience's answers after switching", async () => {
    const user = await startAs("club");
    await answerPage(user);
    await clickButton(user, en.common.previous);
    await screen.findByRole("heading", { name: en.audience.title });
    await chooseAudience(user, "explorer");
    await completeQuestions(user);
    await clickButton(user, en.review.submit);

    await screen.findByRole("heading", { name: en.thanks.title });
    expect(lastBody().audience).toBe("explorer");
    expect(Object.keys(lastBody().answers).every((id) => id.startsWith("E"))).toBe(true);
  });
});

describe("question pages", () => {
  it("makes the question the page heading and focuses it on arrival", async () => {
    await startAs("explorer");
    expect(pageHeading()).toHaveTextContent(prompt("E01"));
    expect(pageHeading()).toHaveFocus();
  });

  it("never shows how many steps or questions there are", async () => {
    const user = await startAs("club");
    for (let i = 0; i < 3; i += 1) {
      expect(screen.queryByText(/\bstep\b|\d+ of \d+|\bof \d+\b/i)).toBeNull();
      expect(screen.queryByRole("progressbar")).toBeNull();
      expect(document.querySelector("progress")).toBeNull();
      await answerPage(user);
      await next(user);
    }
  });

  it("blocks Next until answered and marks the question", async () => {
    const user = await startAs("explorer");
    await clickButton(user, en.common.next);
    expect(within(question("E01")).getByText(en.errors.required)).toBeInTheDocument();
    expect(screen.getByRole("radiogroup")).toHaveAttribute("aria-invalid", "true");
    expect(pageHeading()).toHaveTextContent(prompt("E01"));
  });

  it("clears an error as soon as it's fixed", async () => {
    const user = await startAs("explorer");
    await clickButton(user, en.common.next);
    await user.click(screen.getByRole("radio", { name: "Beirut" }));
    await waitFor(() => expect(screen.queryByText(en.errors.required)).toBeNull());
  });

  it("enforces the selection limit and explains it", async () => {
    const user = await startAs("explorer");
    await advanceTo(user, "E03");
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
    const user = await startAs("explorer");
    await advanceTo(user, "E03");
    expect(within(question("E03")).getAllByRole("checkbox")).toHaveLength(9);
    expect(question("E03").querySelector("label")).not.toHaveAttribute("role");
    expect(question("E03").querySelector("label")).not.toHaveAttribute("aria-checked");
  });

  it("preserves answers when moving between pages", async () => {
    const user = await startAs("explorer");
    await user.click(screen.getByRole("radio", { name: "Beirut" }));
    await next(user);
    expect(isOnScreen("E01b")).toBe(true);
    await clickButton(user, en.common.previous);
    await waitFor(() => expect(isOnScreen("E01")).toBe(true));
    expect(screen.getByRole("radio", { name: "Beirut" })).toBeChecked();
  });
});

describe("routing between pages", () => {
  it("follows Tripoli with the area page and other cities with the travel page", async () => {
    let user = await startAs("explorer");
    await user.click(screen.getByRole("radio", { name: "Tripoli" }));
    await next(user);
    expect(idsOnScreen()).toEqual(["E01a"]);

    document.body.innerHTML = "";
    sessionStorage.clear();
    user = await startAs("explorer");
    await user.click(screen.getByRole("radio", { name: "Batroun" }));
    await next(user);
    expect(idsOnScreen()).toEqual(["E01b"]);
  });

  it("discards the area when the city changes away from Tripoli", async () => {
    const user = await startAs("explorer");
    await user.click(screen.getByRole("radio", { name: "Tripoli" }));
    await next(user);
    await user.click(screen.getByRole("radio", { name: "Al Mina" }));
    await clickButton(user, en.common.previous);
    await waitFor(() => expect(isOnScreen("E01")).toBe(true));
    await user.click(screen.getByRole("radio", { name: "Beirut" }));
    await next(user);
    expect(idsOnScreen()).toEqual(["E01b"]);

    await completeQuestions(user);
    await clickButton(user, en.review.submit);
    await screen.findByRole("heading", { name: en.thanks.title });
    expect(lastBody().answers).not.toHaveProperty("E01a");
    expect(lastBody().answers.E01).toBe("beirut");
  });

  it("asks clubs about prices only when participants pay", async () => {
    const user = await startAs("club");
    await advanceTo(user, "C27");
    await user.click(screen.getByRole("radio", { name: "Never" }));
    await next(user);
    expect(idsOnScreen()).toEqual(["C05"]);

    await clickButton(user, en.common.previous);
    await waitFor(() => expect(isOnScreen("C27")).toBe(true));
    await user.click(screen.getByRole("radio", { name: "Sometimes" }));
    await next(user);
    expect(idsOnScreen()).toEqual(["C28", "C29"]);
    expect(within(question("C29")).getByRole("checkbox", { name: "Whish" })).toBeInTheDocument();
  });

  it("titles a shared page by its section and checks headcounts are whole numbers", async () => {
    const user = await startAs("club");
    await advanceTo(user, "C25");
    expect(idsOnScreen()).toEqual(["C25", "C26"]);
    expect(pageHeading()).toHaveTextContent(stepsByAudience.club[0].title.en);

    const signedUp = screen.getByRole("textbox", { name: /how many people signed up/ });
    expect(signedUp).toHaveAttribute("inputmode", "numeric");
    await user.type(signedUp, "twelve");
    await clickButton(user, en.common.next);
    expect(within(question("C25")).getByText(en.errors.not_number)).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(en.question.stepErrors(1));

    await user.clear(signedUp);
    await user.type(signedUp, "12");
    await next(user);
    expect(idsOnScreen()).toEqual(["C27"]);
  });
});

describe("contact details", () => {
  const toInvite = async () => {
    const user = await startAs("explorer");
    await advanceTo(user, "E21");
    return user;
  };
  const interviewContact = () =>
    screen.getByRole("textbox", { name: /Optional contact for the follow-up interview/ });

  it("asks for a WhatsApp number only after the launch invite is accepted", async () => {
    const user = await toInvite();
    await user.click(screen.getByRole("radio", { name: "No, thanks" }));
    await next(user);
    expect(idsOnScreen()).toEqual(["E16"]);

    await clickButton(user, en.common.previous);
    await waitFor(() => expect(isOnScreen("E21")).toBe(true));
    await user.click(screen.getByRole("radio", { name: "Yes, invite me" }));
    await next(user);
    const number = screen.getByRole("textbox", { name: /WhatsApp number for the invite/ });
    expect(pageHeading()).toHaveTextContent(prompt("E22"));
    expect(number).toHaveAccessibleDescription(/only use it to send the launch invite/);
    expect(number).toHaveAttribute("inputmode", "tel");
  });

  it("sends each contact with its own opt-in, and never keeps them in the draft", async () => {
    const user = await toInvite();
    await user.click(screen.getByRole("radio", { name: "Yes, invite me" }));
    await next(user);
    await user.type(screen.getByRole("textbox"), "+961 3 123 456");
    expect(JSON.stringify({ ...sessionStorage })).not.toContain("123 456");
    await next(user);
    await user.click(screen.getByRole("radio", { name: "Yes, I opt in" }));
    await next(user);
    await user.type(interviewContact(), "person@example.com");
    await completeQuestions(user);

    expect(reviewItem("E22")).toHaveTextContent("+961 3 123 456");
    expect(JSON.stringify({ ...sessionStorage })).not.toContain("person@example.com");
    await clickButton(user, en.review.submit);

    await screen.findByRole("heading", { name: en.thanks.title });
    expect(lastBody().answers).toMatchObject({
      E21: "yes_invite_me",
      E22: "+961 3 123 456",
      E17: "person@example.com",
    });
    expect(screen.getByText(en.thanks.contactOptIn)).toBeInTheDocument();
  });

  it("doesn't require contact details after opting in", async () => {
    const user = await toInvite();
    await user.click(screen.getByRole("radio", { name: "No, thanks" }));
    await next(user);
    await user.click(screen.getByRole("radio", { name: "Yes, I opt in" }));
    await next(user);
    expect(idsOnScreen()).toEqual(["E17"]);
    await next(user);
    expect(idsOnScreen()).toEqual(["E23", "E24"]);
  });

  it("flags a contact in the wrong format", async () => {
    const user = await toInvite();
    await user.click(screen.getByRole("radio", { name: "No, thanks" }));
    await next(user);
    await user.click(screen.getByRole("radio", { name: "Yes, I opt in" }));
    await next(user);
    await user.type(interviewContact(), "not valid!");
    await clickButton(user, en.common.next);

    expect(await screen.findByText(en.errors.contact_invalid)).toBeInTheDocument();
    expect(interviewContact()).toHaveAttribute("aria-invalid", "true");
  });

  it("discards details typed before the opt-in was withdrawn", async () => {
    const user = await toInvite();
    await user.click(screen.getByRole("radio", { name: "No, thanks" }));
    await next(user);
    await user.click(screen.getByRole("radio", { name: "Yes, I opt in" }));
    await next(user);
    await user.type(interviewContact(), "person@example.com");
    await clickButton(user, en.common.previous);
    await waitFor(() => expect(isOnScreen("E16")).toBe(true));
    await user.click(screen.getByRole("radio", { name: "No" }));
    await next(user);
    expect(idsOnScreen()).toEqual(["E23", "E24"]);

    await completeQuestions(user);
    expect(screen.queryByText("person@example.com")).toBeNull();
    await clickButton(user, en.review.submit);
    await screen.findByRole("heading", { name: en.thanks.title });
    expect(JSON.stringify(lastBody())).not.toContain("person@example.com");
  });
});

describe("language switching", () => {
  it("renders Arabic right-to-left from the start", async () => {
    const user = renderSurvey("ar");
    expect(screen.getByRole("heading", { level: 1, name: ar.welcome.title })).toBeInTheDocument();
    await clickButton(user, ar.welcome.start);
    expect(pageHeading()).toHaveTextContent(ar.screening.adultQuestion);
  });

  it("switches direction, URL and title in place", async () => {
    const user = renderSurvey();
    await clickButton(user, en.common.switchLanguage);

    expect(document.documentElement.dir).toBe("rtl");
    expect(document.documentElement.lang).toBe("ar");
    expect(window.location.pathname).toBe("/ar");
    expect(document.title).toBe(ar.meta.title);
    expect(screen.getByRole("heading", { level: 1, name: ar.welcome.title })).toBeInTheDocument();

    await clickButton(user, ar.common.switchLanguage);
    expect(document.documentElement.dir).toBe("ltr");
    expect(window.location.pathname).toBe("/en");
  });

  it("keeps answers and translates questions and errors mid-survey", async () => {
    const user = await startAs("explorer");
    await user.click(screen.getByRole("radio", { name: "Beirut" }));
    await next(user);
    await clickButton(user, en.common.next);
    expect(within(question("E01b")).getByText(en.errors.required)).toBeInTheDocument();

    await clickButton(user, en.common.switchLanguage);
    expect(pageHeading()).toHaveTextContent(getQuestion("E01b").prompt.ar);
    expect(within(question("E01b")).getByText(ar.errors.required)).toBeInTheDocument();

    await clickButton(user, ar.common.previous);
    await waitFor(() => expect(isOnScreen("E01")).toBe(true));
    expect(screen.getByRole("radio", { name: "بيروت" })).toBeChecked();
  });

  it("records the language in use when submitting", async () => {
    const user = await toReview("club");
    await clickButton(user, en.common.switchLanguage);
    await clickButton(user, ar.review.submit);
    await screen.findByRole("heading", { name: ar.thanks.title });
    expect(lastBody().locale).toBe("ar");
  });
});

describe("review", () => {
  it("lists every question that applies, marking blanks", async () => {
    await toReview("explorer");
    for (const q of questionsFor("explorer").filter((q) => q.id !== "E01a")) {
      expect(reviewItem(q.id), q.id).not.toBeNull();
    }
    expect(reviewItem("E01a")).toBeNull();
    expect(within(reviewItem("E15")!).getByText(en.review.notAnswered)).toBeInTheDocument();
  });

  it("leaves out the contact questions when nobody opted in", async () => {
    await toReview("explorer", { E21: "No, thanks", E16: "No" });
    expect(reviewItem("E21")).not.toBeNull();
    expect(reviewItem("E22")).toBeNull();
    expect(reviewItem("E17")).toBeNull();
  });

  it("edits an answer and returns straight to review", async () => {
    const user = await toReview("explorer");
    await clickButton(user, en.review.edit(stepsByAudience.explorer[0].title.en));
    await waitFor(() => expect(isOnScreen("E01")).toBe(true));
    await user.click(screen.getByRole("radio", { name: "Batroun" }));
    await clickButton(user, en.review.backToReview);

    await screen.findByRole("heading", { level: 1, name: en.review.title });
    expect(within(reviewItem("E01")!).getByText("Batroun")).toBeInTheDocument();
  });

  it("asks a follow-up an edit reveals before returning to review", async () => {
    const user = await toReview("explorer");
    await clickButton(user, en.review.edit(stepsByAudience.explorer[0].title.en));
    await waitFor(() => expect(isOnScreen("E01")).toBe(true));
    await user.click(screen.getByRole("radio", { name: "Tripoli" }));
    await clickButton(user, en.review.backToReview);

    await waitFor(() => expect(idsOnScreen()).toEqual(["E01a"]));
    await user.click(screen.getByRole("radio", { name: "Al Mina" }));
    await clickButton(user, en.review.backToReview);
    await screen.findByRole("heading", { level: 1, name: en.review.title });
    expect(within(reviewItem("E01a")!).getByText("Al Mina")).toBeInTheDocument();
    expect(reviewItem("E01b")).toBeNull();
  });
});

describe("submission", () => {
  it("sends consent and answers, then shows the thank-you screen", async () => {
    const user = await toReview("explorer");
    await clickButton(user, en.review.submit);

    expect(await screen.findByRole("heading", { name: en.thanks.title })).toBeInTheDocument();
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
    const user = await toReview("explorer");

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
    const user = await toReview("explorer");
    await clickButton(user, en.review.submit);

    expect(await screen.findByRole("alert")).toHaveTextContent(en.submit.network);
    const firstId = lastBody().submissionId;
    expect(within(reviewItem("E01")!).getByText("Beirut")).toBeInTheDocument();

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
    const user = await toReview("explorer");
    await clickButton(user, en.review.submit);

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.getByRole("button", { name: en.submit.retry })).toBeEnabled();
  });

  it("takes the person to a question the server rejects", async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ ok: false, code: "invalid", fields: ["E05"] }, { status: 400 }),
    );
    const user = await toReview("explorer");
    await clickButton(user, en.review.submit);

    await waitFor(() => expect(idsOnScreen()).toEqual(["E05"]));
    expect(pageHeading()).toHaveTextContent(prompt("E05"));
    expect(within(question("E05")).getByText(en.errors.fallback)).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(en.review.invalid);
  });

  it("offers the other survey to people who are both", async () => {
    const user = await toReview("explorer");
    await clickButton(user, en.review.submit);
    await screen.findByRole("heading", { name: en.thanks.title });
    const firstId = lastBody().submissionId;

    await clickButton(user, en.thanks.takeOtherSurvey);
    await waitFor(() => expect(idsOnScreen()).toEqual(["C01"]));
    expect(within(question("C01")).queryByRole("radio", { checked: true })).toBeNull();

    await completeQuestions(user);
    await clickButton(user, en.review.submit);
    await screen.findByRole("heading", { name: en.thanks.title });
    expect(lastBody().audience).toBe("club");
    expect(lastBody().submissionId).not.toBe(firstId);
  });
});

describe("draft", () => {
  it("restores answers and position after a reload", async () => {
    const user = await startAs("explorer");
    await user.click(screen.getByRole("radio", { name: "Tripoli" }));
    await next(user);
    await user.click(screen.getByRole("radio", { name: "Al Mina" }));

    document.body.innerHTML = "";
    renderSurvey();

    expect(await screen.findByText(en.draft.restored)).toBeInTheDocument();
    expect(idsOnScreen()).toEqual(["E01a"]);
    expect(screen.getByRole("radio", { name: "Al Mina" })).toBeChecked();
  });

  it("ignores a corrupted draft", async () => {
    sessionStorage.setItem("hobbi-survey-draft-v3", '{"screen":{"name":"thanks"}}');
    renderSurvey();
    expect(await screen.findByRole("heading", { name: en.welcome.title })).toBeInTheDocument();
  });
});
