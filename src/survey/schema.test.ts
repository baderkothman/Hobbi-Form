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
    for (const id of ["E01", "E01b", "E03", "E16"]) {
      const answers = validAnswers("explorer");
      delete answers[id];
      expect(failedFields("explorer", answers)).toEqual([id]);
    }
  });

  it("lets optional choice questions be skipped", () => {
    const answers = validAnswers("explorer");
    delete answers.E23;
    delete answers.E24;
    expect(validate("explorer", answers).success).toBe(true);
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

  it("accepts whole-number counts, typed or numeric, and leaves them optional", () => {
    const base = validAnswers("club");
    const result = validate("club", { ...base, C25: " 12 ", C26: 9 });
    expect(result.success && result.response.answers).toMatchObject({ C25: 12, C26: 9 });
    expect(validate("club", { ...base, C25: "" }).success).toBe(true);
  });

  it("rejects counts that aren't whole numbers", () => {
    const base = validAnswers("club");
    for (const value of ["-1", "2.5", "twelve", -3, 1.5, "100001"]) {
      expect(failedFields("club", { ...base, C25: value })).toEqual(["C25"]);
    }
  });

  it("drops answers to questions the routing hides instead of storing them", () => {
    const result = validate("explorer", {
      ...validAnswers("explorer"),
      E01: "beirut",
      E01a: "al_mina",
    });
    expect(result.success).toBe(true);
    expect(result.success && result.response.answers).not.toHaveProperty("E01a");
  });

  it("requires the routed question that applies", () => {
    const answers: Answers = { ...validAnswers("explorer"), E01: "tripoli" };
    delete answers.E01b;
    expect(failedFields("explorer", answers)).toEqual(["E01a"]);
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

  it("needs consent, at any age", () => {
    expect(parse({ adult: true, consent: true }).success).toBe(true);
    expect(parse({ adult: false, consent: true }).success).toBe(true);
    expect(parse({ adult: true, consent: false }).success).toBe(false);
    expect(parse({ adult: true }).success).toBe(false);
  });

  it("accepts under-18s as explorers only", () => {
    const minor = { screening: { adult: false, consent: true } };
    expect(submissionSchema.safeParse(validSubmission("explorer", minor)).success).toBe(true);
    expect(submissionSchema.safeParse(validSubmission("club", minor)).success).toBe(false);
  });

  it("drops the adult age ranges from a minor's answers", () => {
    const result = validateSubmission(
      submissionSchema.parse(
        validSubmission("explorer", { screening: { adult: false, consent: true } }),
      ) as Submission,
    );
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.response.adult).toBe(false);
    expect(result.response.answers).not.toHaveProperty("E23");
    expect(result.response.answers).toHaveProperty("E24");
  });

  it("never stores contact details from someone under 18", () => {
    const result = validateSubmission(
      submissionSchema.parse(
        validSubmission("explorer", {
          screening: { adult: false, consent: true },
          answers: {
            ...validAnswers("explorer"),
            E21: "yes_invite_me",
            E22: "+961 3 123 456",
            E16: "yes_i_opt_in",
            E17: "teen@example.com",
          },
        }),
      ) as Submission,
    );
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.response.contacts).toBeNull();
    expect(result.response.contactConsent).toBe(false);
    for (const id of ["E21", "E22", "E16", "E17"]) {
      expect(result.response.answers).not.toHaveProperty(id);
    }
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
    expect(result.response.contacts).toEqual({ E17: "person@example.com" });
    expect(result.response.contactConsent).toBe(true);
    expect(result.response.answers).not.toHaveProperty("E17");
  });

  it("keeps each contact with the opt-in it was given for", () => {
    const result = validate("explorer", {
      ...optedIn,
      E21: "yes_invite_me",
      E22: "+961 3 123 456",
    });
    expect(result.success && result.response.contacts).toEqual({
      E22: "+961 3 123 456",
      E17: "person@example.com",
    });
  });

  it("discards contact details when the person did not opt in", () => {
    const result = validate("explorer", {
      ...optedIn,
      E16: "no",
      E21: "no_thanks",
      E22: "+961 3 123 456",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.response.contacts).toBeNull();
    expect(result.response.contactConsent).toBe(false);
    expect(JSON.stringify(result.response)).not.toContain("person@example.com");
    expect(JSON.stringify(result.response)).not.toContain("123 456");
  });

  it("never requires contact details, even after opting in", () => {
    const answers: Answers = { ...optedIn };
    delete answers.E17;
    const result = validate("explorer", answers);
    expect(result.success && result.response.contacts).toBeNull();
  });

  it("accepts a WhatsApp number, or an email where the question allows it", () => {
    for (const E17 of ["a@b.co", "+961 3 123 456", "٠٣١٢٣٤٥٦", "03 123456"]) {
      expect(validate("explorer", { ...optedIn, E17 }).success).toBe(true);
    }
    const pilot = { ...validAnswers("club"), C13: "maybe_tell_me_more" };
    for (const C30 of ["+961 3 123 456", "(03) 123-456"]) {
      expect(validate("club", { ...pilot, C30 }).success).toBe(true);
    }
  });

  it("rejects contact details in an unusable format", () => {
    for (const E17 of ["not valid!", "@hobbi.lb", "123"]) {
      expect(failedFields("explorer", { ...optedIn, E17 })).toEqual(["E17"]);
    }
    // E22 and C30 promise WhatsApp, so an email isn't accepted there.
    expect(
      failedFields("explorer", {
        ...validAnswers("explorer"),
        E21: "yes_invite_me",
        E22: "person@example.com",
      }),
    ).toEqual(["E22"]);
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
