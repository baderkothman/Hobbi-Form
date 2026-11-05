import { describe, expect, it } from "vitest";

import { validAnswers, validSubmission } from "@/test/fixtures";

import {
  answersForSubmission,
  submissionSchema,
  validateSubmission,
  type Submission,
} from "./schema";
import type { Answers } from "./types";

function validate(audience: "explorer" | "club", answers: object) {
  return validateSubmission(
    submissionSchema.parse(validSubmission(audience, { answers })) as Submission,
  );
}

function failedFields(audience: "explorer" | "club", answers: object) {
  const result = validate(audience, answers);
  if (result.success) throw new Error("expected validation to fail");
  return result.fields;
}

describe("required questions", () => {
  it("accepts a complete response without optional answers", () => {
    expect(validate("explorer", validAnswers("explorer")).success).toBe(true);
    expect(validate("club", validAnswers("club")).success).toBe(true);
  });

  it("rejects a missing required answer of each type", () => {
    for (const id of ["E01", "E03", "E08", "E16"]) {
      const answers = validAnswers("explorer");
      delete answers[id];
      expect(failedFields("explorer", answers)).toEqual([id]);
    }
  });

  it("rejects an empty multi-select", () => {
    expect(
      failedFields("explorer", { ...validAnswers("explorer"), E03: [] }),
    ).toEqual(["E03"]);
  });
});

describe("malformed answers", () => {
  it("rejects more selections than the limit", () => {
    const answers = {
      ...validAnswers("explorer"),
      E03: ["instagram", "whatsapp", "facebook", "tiktok"],
    };
    expect(failedFields("explorer", answers)).toEqual(["E03"]);
  });

  it("allows many selections when a question has no limit", () => {
    const answers = {
      ...validAnswers("club"),
      C05: ["instagram", "whatsapp", "facebook", "tiktok", "website"],
    };
    expect(validate("club", answers).success).toBe(true);
  });

  it("rejects options that don't exist, and duplicates", () => {
    const base = validAnswers("explorer");
    expect(failedFields("explorer", { ...base, E01: "paris" })).toEqual(["E01"]);
    expect(failedFields("explorer", { ...base, E03: ["myspace"] })).toEqual([
      "E03",
    ]);
    expect(
      failedFields("explorer", { ...base, E03: ["instagram", "instagram"] }),
    ).toEqual(["E03"]);
  });

  it("rejects scale values outside 1 to 5", () => {
    const base = validAnswers("explorer");
    for (const value of [0, 6, 2.5, "3"]) {
      expect(failedFields("explorer", { ...base, E08: value })).toEqual(["E08"]);
    }
  });

  it("rejects answers from the other audience and unknown keys", () => {
    const base = validAnswers("explorer");
    expect(failedFields("explorer", { ...base, C01: "beirut" })).toContain("C01");
    expect(failedFields("explorer", { ...base, E99: "x" })).toContain("E99");
  });

  it("rejects free text over the limit", () => {
    const answers = { ...validAnswers("explorer"), E15: "x".repeat(1001) };
    expect(failedFields("explorer", answers)).toEqual(["E15"]);
  });

  it("removes control characters from free text", () => {
    const result = validate("explorer", {
      ...validAnswers("explorer"),
      E15: "  good\u0000 idea\nline two ",
    });
    expect(result.success && result.response.answers.E15).toBe(
      "good idea\nline two",
    );
  });
});

describe("consent", () => {
  const parse = (screening: object) =>
    submissionSchema.safeParse(validSubmission("explorer", { screening }));

  it("rejects a submission without both screening answers", () => {
    expect(parse({ adult: true, consent: true }).success).toBe(true);
    expect(parse({ adult: false, consent: true }).success).toBe(false);
    expect(parse({ adult: true, consent: false }).success).toBe(false);
    expect(parse({ adult: true }).success).toBe(false);
  });
});

describe("contact details", () => {
  const optedIn = {
    ...validAnswers("explorer"),
    E16: "yes_i_opt_in",
    E17: "person@example.com",
  };

  it("stores contact details apart from the answers after an opt-in", () => {
    const result = validate("explorer", optedIn);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.response.contact).toBe("person@example.com");
    expect(result.response.contactConsent).toBe(true);
    expect(result.response.answers).not.toHaveProperty("E17");
  });

  it("discards contact details when the person did not opt in", () => {
    const result = validate("explorer", { ...optedIn, E16: "no" });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.response.contact).toBeNull();
    expect(result.response.contactConsent).toBe(false);
    expect(JSON.stringify(result.response)).not.toContain("person@example.com");
  });

  it("never requires contact details, even after opting in", () => {
    const answers: Answers = { ...optedIn };
    delete answers.E17;
    const result = validate("explorer", answers);
    expect(result.success && result.response.contact).toBeNull();
  });

  it("accepts the contact formats each question asks for", () => {
    for (const E17 of ["a@b.co", "@hobbi.lb", "hobbi_lb", "https://instagram.com/hobbi"]) {
      expect(validate("explorer", { ...optedIn, E17 }).success).toBe(true);
    }
    const club = { ...validAnswers("club"), C22: "yes_i_opt_in" };
    for (const C23 of ["a@b.co", "+961 3 123 456", "٠٣١٢٣٤٥٦"]) {
      expect(validate("club", { ...club, C23 }).success).toBe(true);
    }
  });

  it("rejects contact details in an unusable format", () => {
    expect(failedFields("explorer", { ...optedIn, E17: "not valid!" })).toEqual([
      "E17",
    ]);
    expect(
      failedFields("club", {
        ...validAnswers("club"),
        C22: "yes_i_opt_in",
        C23: "call me",
      }),
    ).toEqual(["C23"]);
  });
});

describe("answersForSubmission", () => {
  it("sends only the chosen audience's visible, non-blank answers", () => {
    const sent = answersForSubmission("explorer", {
      ...validAnswers("explorer"),
      C01: "beirut",
      E15: "   ",
      E17: "person@example.com",
    });
    expect(sent).not.toHaveProperty("C01");
    expect(sent).not.toHaveProperty("E15");
    expect(sent).not.toHaveProperty("E17");
  });
});
