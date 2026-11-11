// Parses the survey CSV into typed question objects. Shared by the generator and
// by the contract test that keeps the generated config in sync with the CSV.

const ARABIC = /[؀-ۿ]/;

// v1 had 1–5 scales; their end labels were defined in the survey document, not the CSV.
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

// "E01 = tripoli" shows the question when E01 is tripoli; "E01 != tripoli" when E01
// is answered with anything else; "C27 = always | sometimes" for either value.
function parseShowIf(id, text) {
  const match = text.match(/^([A-Z]\d+[a-z]?)\s*(!?=)\s*(.+)$/);
  if (!match) throw new Error(`${id}: can't read "Shown if" value "${text}"`);
  return {
    question: match[1],
    when: match[2] === "=" ? "in" : "notIn",
    values: match[3].split("|").map((value) => value.trim()),
  };
}

export function parseQuestionsCsv(text) {
  const [header, ...rows] = parseCsvRows(text.replace(/^﻿/, ""));
  const column = (name) => {
    const index = header.indexOf(name);
    if (index === -1) throw new Error(`CSV is missing column "${name}"`);
    return index;
  };
  // Optional columns, added in v2: an absent column reads as empty.
  const optional = (name) => header.indexOf(name);
  const columns = {
    showIf: optional("Shown if"),
    validation: optional("Validation"),
    hintEn: optional("Hint (English)"),
    hintAr: optional("Hint (Arabic)"),
    id: column("ID"),
    audience: column("Audience"),
    type: column("Type"),
    en: column("English question"),
    ar: column("Arabic question"),
    options: column("Options bilingual"),
    required: column("Required"),
    max: column("Max selections"),
  };

  const parsed = rows.map((row) => {
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
    } else if (!["paragraph", "text", "number"].includes(type)) {
      throw new Error(`${id}: unknown question type "${type}"`);
    }

    const cell = (index) => (index === -1 ? "" : (row[index] ?? "").trim());
    if (cell(columns.showIf)) question.showIf = parseShowIf(id, cell(columns.showIf));
    if (cell(columns.validation)) {
      if (!["phone", "phoneOrEmail"].includes(cell(columns.validation))) {
        throw new Error(`${id}: unknown validation "${cell(columns.validation)}"`);
      }
      question.validation = cell(columns.validation);
    }
    if (cell(columns.hintEn) || cell(columns.hintAr)) {
      question.hint = { en: cell(columns.hintEn), ar: cell(columns.hintAr) };
    }
    return question;
  });

  const byId = new Map(parsed.map((question) => [question.id, question]));
  for (const question of parsed.filter((q) => q.showIf)) {
    const parent = byId.get(question.showIf.question);
    if (!parent?.options) throw new Error(`${question.id}: "Shown if" needs a choice question`);
    for (const value of question.showIf.values) {
      if (!parent.options.some((option) => option.value === value)) {
        throw new Error(`${question.id}: ${parent.id} has no option "${value}"`);
      }
    }
  }
  return parsed;
}
