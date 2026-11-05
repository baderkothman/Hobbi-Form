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

async function answerVisibleQuestions(page: Page) {
  const groups = page.locator("[data-question-id]");
  for (let i = 0; i < (await groups.count()); i += 1) {
    const group = groups.nth(i);
    const choices = group.locator("input[type=radio], input[type=checkbox]");
    if ((await choices.count()) > 0 && !(await group.locator("input:checked").count())) {
      await choices.first().check();
    }
  }
}

async function passScreening(page: Page, locale: Locale) {
  const t = messages[locale];
  await page.getByRole("button", { name: t.welcome.start }).click();
  await page.getByRole("radio", { name: t.screening.adultYes }).check();
  await page.getByRole("radio", { name: t.screening.consentYes }).check();
  await page.getByRole("button", { name: t.common.next }).click();
}

test.describe("complete journeys", () => {
  for (const [locale, audience, optionIndex] of [
    ["en", "explorer", 0],
    ["ar", "explorer", 0],
    ["en", "club", 1],
    ["ar", "club", 1],
  ] as const) {
    test(`${audience} in ${locale}: consent to thank-you, with no a11y violations or overflow`, async ({
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
      await expectAccessible(page);

      // Trigger validation so error states are audited too.
      await page.getByRole("button", { name: t.common.next }).click();
      await expect(page.locator(".step-errors")).toHaveText(t.question.stepErrors(2));
      await expect(page.locator(".step-errors")).toHaveRole("alert");
      await expectAccessible(page);
      await page.getByRole("button", { name: t.common.previous }).click();

      await passScreening(page, locale);
      await expect(page.getByRole("heading", { name: t.audience.title })).toBeVisible();
      await page.locator("input[name=audience]").nth(optionIndex).check();
      await expectAccessible(page);
      await page.getByRole("button", { name: t.common.next }).click();

      for (let step = 0; step < 5; step += 1) {
        await expect(page.getByText(t.common.stepCounter(3 + step, 8))).toBeVisible();
        await answerVisibleQuestions(page);
        await expectAccessible(page);
        await expectNoSidewaysScroll(page);
        await page.getByRole("button", { name: t.common.next }).click();
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

  test("a full question group works from the keyboard alone", async ({ page, isMobile }) => {
    test.skip(isMobile, "Keyboard journey is a desktop concern");
    await page.goto("/en");
    await passScreening(page, "en");
    await page.locator("input[name=audience]").first().check();
    await page.getByRole("button", { name: "Next" }).click();

    await expect(page.locator("h1")).toBeFocused();
    await page.keyboard.press("Tab"); // The first group's first radio.
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("radio", { name: "Tripoli" })).toBeChecked();

    await page.keyboard.press("Tab"); // Next group.
    await page.keyboard.press("Space");
    await expect(page.getByRole("radio", { name: "None" })).toBeChecked();

    await page.keyboard.press("Tab"); // First checkbox.
    await page.keyboard.press("Space");
    await expect(page.getByRole("checkbox", { name: "Instagram" })).toBeChecked();
    const outline = await page
      .locator(".hobbi-option:has(input:focus-visible)")
      .evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(outline).toBe("solid");
  });

  test("browser Back moves between steps", async ({ page }) => {
    await page.goto("/en");
    await passScreening(page, "en");
    await expect(page.getByRole("heading", { name: messages.en.audience.title })).toBeVisible();
    await page.goBack();
    await expect(page.getByRole("heading", { name: messages.en.screening.title })).toBeVisible();
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
    E01: "beirut", E02: "none", E03: ["instagram"], E04: ["too_expensive"],
    E05: ["music"], E06: "free", E07: "depends", E08: 3, E09: "either",
    E10: "depends_on_the_activity", E11: "maybe", E12: ["notifications"],
    E13: ["privacy"], E14: 5, E16: "no",
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
