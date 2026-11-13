# Hobbi survey

A bilingual (English and Arabic) market research survey for Explorers and club organizers in Lebanon, built for the Tripoli pilot. Participants need no account. Built with Next.js, the [Kitchn](https://kitchn.tonightpass.com) component library, Tailwind CSS, React Hook Form and Zod.

The survey content (v2) lives in [survey-v2/](survey-v2/): the survey document, the question CSV the app reads, a Google Apps Script that builds the same survey as a Google Form, and the change log from v1. The v1 files in the project root are kept for reference only.

## Get started

Requires Node 24.x.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Fill in the Google service account settings in `.env.local`, then open <http://localhost:3000>. Responses are saved only to the Google Sheet.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` / `npm start` | Build and serve for production |
| `npm test` | Unit and integration tests for validation and Sheet requests |
| `npm run test:e2e` | Browser journeys and axe accessibility audits, on desktop and mobile |
| `npm run lint` / `npm run typecheck` | Static checks |
| `npm run survey:generate` | Rebuild the question config from the CSV |

Run `npx playwright install chromium` once before the first `test:e2e`.

## Configuration

| Variable | Needed | Purpose |
| --- | --- | --- |
| `GOOGLE_SHEET_ID` | Always | ID of the response spreadsheet |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Always | Service account granted Editor access to the spreadsheet |
| `GOOGLE_PRIVATE_KEY` | Always | Private key from that service account's JSON key, with newlines written as `\n` |
| `RATE_LIMIT_SECRET` | In production | Key for hashing network addresses in the hidden `RateLimits` tab. Generate with `openssl rand -hex 32` |

Submissions return 503 if Google Sheets is unavailable or its settings are missing. A respondent can retry with the same submission ID; the first completed row is kept.

### Google Sheets results

The [response spreadsheet](https://docs.google.com/spreadsheets/d/1lu-nkFSZjP30LEEOyPMdCWInJIX7tb8O6CUQh5Tsvjs/edit) has a **Responses** tab with one row per submission, plus automatically updated **Explorers** and **Clubs** tabs showing only the relevant question columns. A **Questions** tab explains each question ID in English and Arabic. Contact columns contain values only when the respondent opted in. Free text is written as a string cell, so a response beginning with `=` stays text. A hidden **RateLimits** tab holds short-lived keyed hashes, apart from survey answers.

To connect it:

1. In Google Cloud, enable the Google Sheets API and create a service account with a JSON key. Keep the JSON key private.
2. Share the spreadsheet with the service account email as **Editor**. Keep general access restricted.
3. Set `GOOGLE_SHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, and `GOOGLE_PRIVATE_KEY` in the app's environment. For Vercel, add them as server-side environment variables and redeploy. Do not put the key in `NEXT_PUBLIC_` variables or commit it.
4. Set `RATE_LIMIT_SECRET` in production and deploy. No database or migration is needed.

The app checks for an existing submission ID before writing and uses an atomic Sheets batch to append the response and remove duplicate IDs. If Google receives the write but the reply is lost, the next retry finds the saved ID. Rate counts are read from the same Sheet and can briefly exceed the limit when different requests arrive simultaneously.

## Deploy

Set the three Google settings and `RATE_LIMIT_SECRET` in Vercel, then deploy. The survey pages are static; only `/api/submissions` runs on the server. No persistent filesystem or database is required.

Behind a reverse proxy you run yourself, make sure it sets `X-Forwarded-For`, or all visitors share one rate limit.

## Change the survey

- **Wording, options, limits, routing:** edit `survey-v2/Hobbi_Survey_Questions_v2.csv`, run `npm run survey:generate`, and bump `SURVEY_VERSION` in `src/survey/config.ts`. Tests fail if the CSV, the generated config, `survey-v2/Hobbi_Market_Research_Survey_v2.md` and `survey-v2/build-google-form.gs` disagree, so update all of them together. If question IDs are added, removed, or reordered, update the **Responses** header and **Questions** tab to match before deploying; the server refuses mismatched headers.
- **Grouping into steps:** `src/survey/config.ts`.

The CSV's extra columns:

| Column | Meaning | Example |
| --- | --- | --- |
| `Shown if` | Show the question only for these answers to an earlier choice question. `!=` means any other answer. | `E01 = tripoli`, `E01 != tripoli`, `C27 = always \| sometimes` |
| `Validation` | `phone` (WhatsApp number) or `phoneOrEmail`. Marks the question as a contact field. | `phone` |
| `Hint (English)`, `Hint (Arabic)` | Shown under the question. | |

A hidden question is never required, and any answer to it is discarded in the browser and again on the server.
- **Everything around the questions:** `src/i18n/messages.ts`.

Option values are derived from the English label. Rewording an English option changes its stored value, so bump the version and account for it in analysis.

## How it fits together

```text
survey-v2/Hobbi_Survey_Questions_v2.csv → scripts/generate-questions.mjs → src/survey/questions.generated.ts

src/survey/       Framework-free survey logic: config, navigation (flow.ts), validation (schema.ts)
src/components/
  ui/kitchn.tsx   The only file that touches Kitchn directly
  survey/         SurveyApp (state), screens, fields (renders any question from config)
src/server/       Submission handling and Google Sheets storage
```

Browser and server share `schema.ts`, so they can't disagree about what's valid.

**Kitchn.** "Kitchen UI" was taken to mean [`kitchn`](https://www.npmjs.com/package/kitchn), formerly `@tonightpass/kitchen`. Buttons, inputs, textareas, checkboxes, progress, notes and cards come from it. It has no radio control, so radios and the rating scale are native inputs styled to match. Its global reset is deliberately left out because it overrides Tailwind and forces left-aligned text. `ui/kitchn.tsx` documents each adaptation.

Kitchn pins dependency versions with known advisories, so `overrides` in `package.json` replaces them with patched `postcss` and `deepmerge-ts` releases. Remove the overrides when a Kitchn release no longer needs them.

## Data and privacy

Responses are stored in the **Responses** tab:

- Each question has a stable ID column (`E01`, `C07`). Multiple-choice selections are JSON arrays in one cell.
- Contact details are in the E22, E17, C30, and C23 columns only after their individual opt-ins. Use each number only for the purpose it was given for. `legacy_contact` holds values imported from older database responses; new submissions leave it blank.
- Nothing is saved for people who decline consent.
- People under 18 can answer as explorers only: they skip the explorer-or-club choice and the age-range question (E23). `respondent_adult` marks their responses; server validation rejects a club response from someone under 18.
- Contact details typed before an opt-in is withdrawn are discarded in the browser and again on the server.
- Rate limiting stores an hourly keyed hash of the IP in a separate hidden tab, never linked to a response. Expired entries are cleared during later successful submissions.
- Logs record outcomes and timings only, never answers.
- Drafts live in `sessionStorage` for the tab's lifetime and exclude every contact field and C21.

**Free text can contain personal details:** people may write anything in E15 and C20, and C21 asks for a club name or handle. Review those cells before sharing the Sheet beyond the research team. To remove someone's contact details, clear the relevant contact cells in their response row. To remove the whole response, delete that row.

There's no admin screen. Open CSV exports with care: a spreadsheet can treat free text beginning with `=` as a formula.

## Abuse protection

Every submission is checked for same-origin requests, JSON content type, a 32 KB size limit, a honeypot field, a limit of 20 submissions per network per hour, and strict validation against the question config. A repeated submission ID is ignored, and the atomic Sheets batch removes duplicate IDs from overlapping retries.

This stops casual abuse, not a determined attacker. If spam appears, add a CAPTCHA such as Cloudflare Turnstile, and account for shared IPs when lowering the rate limit: whole campuses and carriers in Lebanon can share one.
