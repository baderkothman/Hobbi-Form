import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { messages } from "../src/i18n/messages";
import type { Locale } from "../src/survey/types";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function expectAccessible(page: Page) {
  // Wait out the screen's entrance so colour contrast is measured at full opacity.
  await page.waitForTimeout(300);
  const { violations } = await new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .analyze();
  expect(
    violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" | ")}`),
  ).toEqual([]);
}

async function expectNoSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

/** A question page must fit on screen: the person shouldn't have to scroll. */
async function expectNoVerticalScroll(page: Page, label: string) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight,
  );
  expect(overflow, `${label} overflows the screen`).toBeLessThanOrEqual(0);
}

/** Answers the page: the option at `picks[id]`, or the first. */
async function answerVisibleQuestions(page: Page, picks: Record<string, number> = {}) {
  const ids = await page
    .locator("[data-question-id]")
    .evaluateAll((elements) => elements.map((e) => (e as HTMLElement).dataset.questionId!));
  for (const id of ids) {
    const group = page.locator(`[data-question-id="${id}"]`);
    const choices = group.locator("input[type=radio], input[type=checkbox]");
    if ((await choices.count()) > 0 && !(await group.locator("input:checked").count())) {
      await choices.nth(picks[id] ?? 0).check();
    }
  }
  return ids.join("+");
}

async function passScreening(page: Page, locale: Locale) {
  const t = messages[locale];
  await page.getByRole("button", { name: t.welcome.start }).click();
  await page.getByRole("radio", { name: t.screening.adultYes }).check();
  await page.getByRole("button", { name: t.common.next }).click();
  await page.getByRole("radio", { name: t.screening.consentYes }).check();
  await page.getByRole("button", { name: t.common.next }).click();
}

test.describe("complete journeys", () => {
  // The Arabic runs take the Tripoli and paying-club routes; the English runs the others.
  const TRIPOLI = { E01: 1, C01: 1, C27: 1 };
  for (const [locale, audience, optionIndex, picks] of [
    ["en", "explorer", 0, {}],
    ["ar", "explorer", 0, TRIPOLI],
    ["en", "club", 1, {}],
    ["ar", "club", 1, TRIPOLI],
  ] as const) {
    test(`${audience} in ${locale}: one question per screen, no scrolling, no a11y violations`, async ({
      page,
    }) => {
      const t = messages[locale];
      await page.goto(`/${locale}`);
      await expect(page.locator("html")).toHaveAttribute(
        "dir",
        locale === "ar" ? "rtl" : "ltr",
      );
      await expectAccessible(page);
      await expectNoSidewaysScroll(page);

      await page.getByRole("button", { name: t.welcome.start }).click();
      await expect(page.locator("h1")).toHaveText(t.screening.adultQuestion);
      await expectAccessible(page);

      // Trigger validation so error states are audited too.
      await page.getByRole("button", { name: t.common.next }).click();
      await expect(page.locator(".field-error")).toHaveText(t.errors.required);
      await expectAccessible(page);
      await page.getByRole("button", { name: t.common.previous }).click();

      await passScreening(page, locale);
      await expect(page.getByRole("heading", { name: t.audience.title })).toBeVisible();
      await page.locator("input[name=audience]").nth(optionIndex).check();
      await expectAccessible(page);
      await expectNoVerticalScroll(page, "audience");
      await page.getByRole("button", { name: t.common.next }).click();

      for (let guard = 0; guard < 40; guard += 1) {
        if (await page.getByRole("heading", { name: t.review.title }).isVisible()) break;
        // Focus lands on the new page's heading before anything is answered.
        await expect(page.locator("main h1")).toBeFocused();
        const label = await answerVisibleQuestions(page, picks);
        await expectAccessible(page);
        await expectNoSidewaysScroll(page);
        await expectNoVerticalScroll(page, label);
        await page.getByRole("button", { name: t.common.next }).click();
        await expect(page.locator("[data-question-id]").first().or(
          page.getByRole("heading", { name: t.review.title }),
        )).toBeVisible();
      }

      await expect(page.getByRole("heading", { name: t.review.title })).toBeVisible();
      await expectAccessible(page);
      await expectNoSidewaysScroll(page);

      const response = page.waitForResponse("**/api/submissions");
      await page.getByRole("button", { name: t.review.submit }).click();
      expect((await response).status()).toBe(201);

      await expect(page.getByRole("heading", { name: t.thanks.title })).toBeVisible();
      await expectAccessible(page);

      // Back must not reopen a response that has already been sent.
      await page.goBack();
      await expect(page.getByRole("heading", { name: t.thanks.title })).toBeVisible();
    });
  }
});

test.describe("behaviour in a real browser", () => {
  test("exits politely and audits clean when consent is declined", async ({ page }) => {
    const t = messages.en;
    await page.goto("/en");
    await page.getByRole("button", { name: t.welcome.start }).click();
    await page.getByRole("radio", { name: t.screening.adultYes }).check();
    await page.getByRole("button", { name: t.common.next }).click();
    await page.getByRole("radio", { name: t.screening.consentNo }).check();
    await page.getByRole("button", { name: t.common.next }).click();
    await expect(page.getByRole("heading", { name: t.exit.declinedTitle })).toBeVisible();
    await expectAccessible(page);
  });

  test("text buttons keep AA contrast while hovered", async ({ page, isMobile }) => {
    test.skip(isMobile, "Touch screens have no hover");
    await page.goto("/en");
    await page.getByTestId("language-switch").hover();
    await expectAccessible(page);
  });

  test("language switch mirrors the layout without losing answers", async ({ page }) => {
    await page.goto("/en");
    await passScreening(page, "en");
    await page.locator("input[name=audience]").first().check();
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("radio", { name: "Tripoli" }).check();

    const nextBefore = await page.getByRole("button", { name: "Next" }).boundingBox();
    await page.getByTestId("language-switch").click();
    await expect(page).toHaveURL(/\/ar$/);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("radio", { name: "طرابلس" })).toBeChecked();

    // Next sits at the opposite end of the row in right-to-left.
    const nextAfter = await page.getByRole("button", { name: "التالي" }).boundingBox();
    expect(nextAfter!.x).toBeLessThan(nextBefore!.x);

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("radio", { name: "طرابلس" })).toBeChecked();
  });

  test("browser history restores the language that matches the URL", async ({ page }) => {
    await page.goto("/en");
    await page.getByRole("button", { name: messages.en.welcome.start }).click();
    await page.getByTestId("language-switch").click();
    await expect(page).toHaveURL(/\/ar$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");

    await page.goBack();
    await expect(page).toHaveURL(/\/en$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(page.locator("h1")).toHaveText(messages.en.welcome.title);

    await page.goForward();
    await expect(page).toHaveURL(/\/ar$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("h1")).toHaveText(messages.ar.screening.adultQuestion);
  });

  test("choices reflow without sideways scrolling when text is enlarged", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto("/en");
    await passScreening(page, "en");
    await page.locator("input[name=audience]").first().check();
    await page.getByRole("button", { name: messages.en.common.next }).click();
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });

    await expectNoSidewaysScroll(page);
    const smallestChoice = await page.locator(".hobbi-option").evaluateAll((options) =>
      Math.min(...options.map((option) => option.getBoundingClientRect().height)),
    );
    expect(smallestChoice).toBeGreaterThanOrEqual(44);
    await expect(page.getByRole("button", { name: messages.en.common.next })).toBeInViewport();
  });

  test("pages work from the keyboard alone", async ({ page, isMobile }) => {
    test.skip(isMobile, "Keyboard journey is a desktop concern");
    const pressUntilFocused = async (name: string) => {
      for (let i = 0; i < 10; i += 1) {
        await page.keyboard.press("Tab");
        if (await page.getByRole("button", { name }).evaluate((el) => el === document.activeElement)) return;
      }
      throw new Error(`Couldn't tab to ${name}`);
    };

    await page.goto("/en");
    await passScreening(page, "en");
    await page.locator("input[name=audience]").first().check();
    await page.getByRole("button", { name: "Next" }).click();

    // The question is the heading, and it has focus.
    await expect(page.locator("h1")).toBeFocused();
    await expect(page.locator("h1")).toHaveText("Where do you usually attend activities?");
    await page.keyboard.press("Tab");
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("radio", { name: "Tripoli" })).toBeChecked();
    await pressUntilFocused("Next");
    await page.keyboard.press("Enter");

    // Tripoli leads to the area question, on its own page.
    await expect(page.locator("h1")).toHaveText("Which part of Tripoli?");
    await expect(page.locator("h1")).toBeFocused();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Space");
    await expect(page.getByRole("radio", { name: "Al Mina" })).toBeChecked();
    await pressUntilFocused("Next");
    await page.keyboard.press("Enter");

    // E02 and E20 share a page: Tab moves from one question to the next.
    for (const option of ["None", "Never"]) {
      await page.keyboard.press("Tab");
      await page.keyboard.press("Space");
      await expect(page.getByRole("radio", { name: option })).toBeChecked();
    }
    await pressUntilFocused("Next");
    await page.keyboard.press("Enter");

    await page.keyboard.press("Tab"); // First checkbox of E03.
    await page.keyboard.press("Space");
    await expect(page.getByRole("checkbox", { name: "Instagram", exact: true })).toBeChecked();
    const outline = await page
      .locator(".hobbi-option:has(input:focus-visible)")
      .evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(outline).toBe("solid");
  });

  test("browser Back moves between pages", async ({ page }) => {
    await page.goto("/en");
    await passScreening(page, "en");
    await expect(page.getByRole("heading", { name: messages.en.audience.title })).toBeVisible();
    await page.goBack();
    await expect(page.locator("h1")).toHaveText(messages.en.screening.consentQuestion);
    await page.goForward();
    await expect(page.getByRole("heading", { name: messages.en.audience.title })).toBeVisible();
  });

  test("the bare domain follows the browser's language", async ({ browser }) => {
    const context = await browser.newContext({ locale: "ar-LB" });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page).toHaveURL(/\/ar$/);
    await context.close();
  });
});

test.describe("API", () => {
  const answers = {
    E01: "beirut", E01b: "yes_regularly", E02: "none", E20: "never",
    E03: ["instagram"], E04: ["too_expensive"], E05: ["music"], E06: "free",
    E07: "depends", E09: "either", E10: "depends_on_the_activity",
    E18: "whatsapp", E19: "android", E12: ["notifications"], E13: ["privacy"],
    E21: "no_thanks", E16: "no",
  };
  const submission = () => ({
    submissionId: crypto.randomUUID(),
    locale: "en",
    screening: { adult: true, consent: true },
    audience: "explorer",
    answers,
  });

  test("saves once, even when a request is repeated", async ({ request }) => {
    const data = submission();
    expect((await request.post("/api/submissions", { data })).status()).toBe(201);
    expect((await request.post("/api/submissions", { data })).status()).toBe(200);
  });

  test("rejects invalid data server-side", async ({ request }) => {
    const data = { ...submission(), answers: { ...answers, E03: ["a", "b", "c", "d"] } };
    const response = await request.post("/api/submissions", { data });
    expect(response.status()).toBe(400);
    expect((await response.json()).fields).toEqual(["E03"]);
  });
});
