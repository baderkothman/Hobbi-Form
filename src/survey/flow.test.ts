import { describe, expect, it } from "vitest";

import {
  afterScreening,
  completedFraction,
  nextScreen,
  previousScreen,
  stepNumber,
  TOTAL_STEPS,
  type Screen,
} from "./flow";

describe("screening", () => {
  it("continues only when adult and consenting", () => {
    expect(afterScreening("yes", "yes").name).toBe("audience");
  });

  it("ends the survey for anyone under 18, whatever they consent to", () => {
    expect(afterScreening("no", "yes").name).toBe("ineligible");
    expect(afterScreening("no", "no").name).toBe("ineligible");
  });

  it("ends the survey politely when consent is declined", () => {
    expect(afterScreening("yes", "no").name).toBe("declined");
  });
});

describe("navigation", () => {
  it.each(["explorer", "club"] as const)(
    "walks %s from audience choice through five steps to review, and back",
    (audience) => {
      const forward: Screen[] = [{ name: "audience" }];
      while (forward.at(-1)!.name !== "review") {
        forward.push(nextScreen(forward.at(-1)!, audience));
      }
      expect(forward.filter((s) => s.name === "questions")).toHaveLength(5);

      const backward: Screen[] = [{ name: "review" }];
      while (backward.at(-1)!.name !== "audience") {
        backward.push(previousScreen(backward.at(-1)!, audience));
      }
      expect(backward.reverse()).toEqual(forward);
    },
  );

  it("sends exits back to the screening questions", () => {
    expect(previousScreen({ name: "declined" }).name).toBe("screening");
    expect(previousScreen({ name: "ineligible" }).name).toBe("screening");
  });

  it("leaves the thank-you screen where it is", () => {
    expect(previousScreen({ name: "thanks" }).name).toBe("thanks");
  });
});

describe("progress", () => {
  it("numbers the flow from 1 to the total", () => {
    expect(stepNumber({ name: "screening" })).toBe(1);
    expect(stepNumber({ name: "audience" })).toBe(2);
    expect(stepNumber({ name: "questions", step: 0 })).toBe(3);
    expect(stepNumber({ name: "questions", step: 4 })).toBe(7);
    expect(stepNumber({ name: "review" })).toBe(TOTAL_STEPS);
    expect(stepNumber({ name: "welcome" })).toBeNull();
  });

  it("counts completed work, reaching 1 only at the end", () => {
    expect(completedFraction({ name: "screening" })).toBe(0);
    expect(completedFraction({ name: "review" })).toBeLessThan(1);
    expect(completedFraction({ name: "thanks" })).toBe(1);
  });
});
