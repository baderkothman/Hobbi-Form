// The survey's navigation as pure functions, so routing can be tested without a
// browser. The rendered app only ever moves between the screens defined here.
import { stepsByAudience } from "./config";
import type { Audience } from "./types";

export type Screen =
  | { name: "welcome" }
  | { name: "screening" }
  | { name: "ineligible" }
  | { name: "declined" }
  | { name: "audience" }
  | { name: "questions"; step: number }
  | { name: "review" }
  | { name: "thanks" };

export type YesNo = "yes" | "no";

export function afterScreening(adult: YesNo, consent: YesNo): Screen {
  if (adult === "no") return { name: "ineligible" };
  if (consent === "no") return { name: "declined" };
  return { name: "audience" };
}

export function nextScreen(screen: Screen, audience?: Audience): Screen {
  switch (screen.name) {
    case "welcome":
      return { name: "screening" };
    case "audience":
      return { name: "questions", step: 0 };
    case "questions": {
      if (!audience) return { name: "audience" };
      const last = stepsByAudience[audience].length - 1;
      return screen.step < last
        ? { name: "questions", step: screen.step + 1 }
        : { name: "review" };
    }
    default:
      return screen;
  }
}

export function previousScreen(screen: Screen, audience?: Audience): Screen {
  switch (screen.name) {
    case "screening":
      return { name: "welcome" };
    case "ineligible":
    case "declined":
    case "audience":
      return { name: "screening" };
    case "questions":
      return screen.step > 0
        ? { name: "questions", step: screen.step - 1 }
        : { name: "audience" };
    case "review":
      return audience
        ? { name: "questions", step: stepsByAudience[audience].length - 1 }
        : { name: "audience" };
    default:
      return screen;
  }
}

/** Screening + audience + question steps + review. Both audiences have five question steps. */
export const TOTAL_STEPS = 8;

/** The 1-based step number, or null for screens outside the numbered flow. */
export function stepNumber(screen: Screen): number | null {
  switch (screen.name) {
    case "screening":
      return 1;
    case "audience":
      return 2;
    case "questions":
      return 3 + screen.step;
    case "review":
      return TOTAL_STEPS;
    default:
      return null;
  }
}

/** Share of the mosaic laid so far: completed steps over all steps. */
export function completedFraction(screen: Screen): number {
  if (screen.name === "thanks") return 1;
  const step = stepNumber(screen);
  return step === null ? 0 : (step - 1) / TOTAL_STEPS;
}
