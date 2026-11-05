// Parses the survey CSV into typed question objects. Shared by the generator and
// by the contract test that keeps the generated config in sync with the CSV.

const ARABIC = /[؀-ۿ]/;

// The scale's end labels are defined in the survey document, not the CSV.
const SCALE = {
  min: 1,
  max: 5,
  minLabel: { en: "Not at all", ar: "أبداً" },
  maxLabel: { en: "Very", ar: "جداً" },
};

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(cell);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

// Options are "English / Arabic". Three cases need care:
//  - "1–10" has no translation, so both languages show the same text.
//  - "$10–19 / 10–19$" has an Arabic side with no Arabic letters, so with exactly
//    two parts the position decides.
//  - "Unsure / prefer not to say / غير متأكد / أفضل عدم الإجابة" has slashes inside
//    each side, so with more parts the script decides.
export function parseOptionLabel(raw) {
  const parts = raw.split(" / ").map((part) => part.trim());
  if (parts.length === 1) return { en: parts[0], ar: parts[0] };
  if (parts.length === 2) return { en: parts[0], ar: parts[1] };
  return {
    en: parts.filter((part) => !ARABIC.test(part)).join(" / "),
    ar: parts.filter((part) => ARABIC.test(part)).join(" / "),
  };
}

// Stored option values: readable in analysis exports, independent of language.
export function slugifyOption(english) {
  return english
    .toLowerCase()
    .replace(/\+/g, "_plus")
    .replace(/\$/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function parseQuestionsCsv(text) {
  const [header, ...rows] = parseCsvRows(text.replace(/^﻿/, ""));
  const column = (name) => {
    const index = header.indexOf(name);
    if (index === -1) throw new Error(`CSV is missing column "${name}"`);
    return index;
  };
  const columns = {
    id: column("ID"),
    audience: column("Audience"),
    type: column("Type"),
    en: column("English question"),
    ar: column("Arabic question"),
    options: column("Options bilingual"),
    required: column("Required"),
    max: column("Max selections"),
  };

  return rows.map((row) => {
    const id = row[columns.id];
    const type = row[columns.type];
    const question = {
      id,
      audience: row[columns.audience],
      type,
      prompt: { en: row[columns.en], ar: row[columns.ar] },
      required: row[columns.required] === "True",
    };

    if (type === "mc" || type === "checkbox") {
      const options = row[columns.options].split(" ; ").map((raw) => {
        const label = parseOptionLabel(raw);
        return { value: slugifyOption(label.en), label };
      });
      const values = options.map((option) => option.value);
      if (new Set(values).size !== values.length || values.includes("")) {
        throw new Error(`${id}: option values must be unique and non-empty`);
      }
      question.options = options;
      if (row[columns.max]) question.maxSelections = Number(row[columns.max]);
    } else if (type === "scale") {
      Object.assign(question, SCALE);
    } else if (type !== "paragraph" && type !== "text") {
      throw new Error(`${id}: unknown question type "${type}"`);
    }
    return question;
  });
}
