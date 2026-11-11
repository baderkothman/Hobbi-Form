# Hobbi survey

A bilingual (English and Arabic) market research survey for Explorers and club organizers in Lebanon, built for the Tripoli pilot. Participants need no account. Built with Next.js, the [Kitchn](https://kitchn.tonightpass.com) component library, Tailwind CSS, React Hook Form and Zod.

The survey content (v2) lives in [survey-v2/](survey-v2/): the survey document, the question CSV the app reads, a Google Apps Script that builds the same survey as a Google Form, and the change log from v1. The v1 files in the project root are kept for reference only.

## Get started

Requires Node 24 or newer.

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. Responses are saved to embedded Postgres in `.data/pglite`, so development needs no setup.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` / `npm start` | Build and serve for production |
| `npm test` | Unit and integration tests, including real SQL on embedded Postgres |
| `npm run test:e2e` | Browser journeys and axe accessibility audits, on desktop and mobile |
| `npm run lint` / `npm run typecheck` | Static checks |
| `npm run survey:generate` | Rebuild the question config from the CSV |
| `npm run db:migrate` | Apply migrations to `DATABASE_URL` |

Run `npx playwright install chromium` once before the first `test:e2e`.

## Configuration

| Variable | Needed | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | In production, unless using embedded storage | Postgres connection string |
| `HOBBI_EMBEDDED_DB_PATH` | Single-server deployments only | Saves responses to embedded Postgres at this path |
| `RATE_LIMIT_SECRET` | In production | Key for hashing IPs in the rate limiter. Generate with `openssl rand -hex 32` |

In production, submissions return 503 until storage and the secret are configured, so a response is never written somewhere it could be lost.

## Deploy

**Serverless (for example Vercel with Neon).** The filesystem doesn't persist, so use Postgres:

1. Set `DATABASE_URL` and `RATE_LIMIT_SECRET`.
2. Run `DATABASE_URL=... npm run db:migrate` before each deploy that adds a migration.
3. Deploy. The survey pages are static, and only `/api/submissions` runs on the server.

**Single server.** Set `HOBBI_EMBEDDED_DB_PATH` to a persistent, backed-up directory, set `RATE_LIMIT_SECRET`, then run `npm run build && npm start`. Migrations apply automatically on this path. Embedded Postgres allows one process at a time, so don't run replicas.

Behind a reverse proxy you run yourself, make sure it sets `X-Forwarded-For`, or all visitors share one rate limit.

## Change the survey

- **Wording, options, limits, routing:** edit `survey-v2/Hobbi_Survey_Questions_v2.csv`, run `npm run survey:generate`, and bump `SURVEY_VERSION` in `src/survey/config.ts`. Tests fail if the CSV, the generated config, `survey-v2/Hobbi_Market_Research_Survey_v2.md` and `survey-v2/build-google-form.gs` disagree, so update all of them together.
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
src/server/       Submission handling, rate limiting, storage, migrations
```

Browser and server share `schema.ts`, so they can't disagree about what's valid.

**Kitchn.** "Kitchen UI" was taken to mean [`kitchn`](https://www.npmjs.com/package/kitchn), formerly `@tonightpass/kitchen`. Buttons, inputs, textareas, checkboxes, progress, notes and cards come from it. It has no radio control, so radios and the rating scale are native inputs styled to match. Its global reset is deliberately left out because it overrides Tailwind and forces left-aligned text. `ui/kitchn.tsx` documents each adaptation.

Kitchn pins dependency versions with known advisories, so `overrides` in `package.json` replaces them with patched `postcss` and `deepmerge-ts` releases. Remove the overrides when a Kitchn release no longer needs them.

## Data and privacy

Responses are stored in a single `responses` table:

- `answers` holds answers as JSON, keyed by question ID (`E01`, `C07`).
- `contacts` holds contact details keyed by question (E22 launch invite, E17 interview, C30 pilot, C23 interview), apart from the answers so exports can leave them out. Each is collected only after its own opt-in, so use a number only for the purpose it was given for. A database constraint rejects contact details without `contact_consent`. (`contact` is the v1 column.)
- Nothing is saved for people who decline consent.
- People under 18 can answer as explorers only: they skip the explorer-or-club choice and the age-range question (E23). `respondent_adult` marks their responses, and a database constraint refuses a club response from someone under 18.
- Contact details typed before an opt-in is withdrawn are discarded in the browser and again on the server.
- Rate limiting stores an hourly keyed hash of the IP, never linked to a response, and old rows are deleted automatically.
- Logs record outcomes and timings only, never answers.
- Drafts live in `sessionStorage` for the tab's lifetime and exclude every contact field and C21.

**Free text can contain personal details:** people may write anything in E15 and C20, and C21 asks for a club name or handle. Treat `answers` as personal data, and review it before sharing beyond the research team.

Export for analysis, without contact details:

```sql
SELECT submission_id, audience, locale, survey_version, answers, created_at FROM responses;
```

Remove someone's contact details on request:

```sql
UPDATE responses SET contacts = NULL, contact = NULL, contact_consent = false
WHERE contacts::text LIKE '%+961 3 123 456%';
```

There's no admin screen. Open CSV exports with care: a spreadsheet can treat free text beginning with `=` as a formula.

## Abuse protection

Every submission is checked for same-origin requests, JSON content type, a 32 KB size limit, a honeypot field, a limit of 20 submissions per network per hour, and strict validation against the question config. A repeated submission ID is ignored, so retries can't create duplicates or overwrite a response.

This stops casual abuse, not a determined attacker. If spam appears, add a CAPTCHA such as Cloudflare Turnstile, and account for shared IPs when lowering the rate limit: whole campuses and carriers in Lebanon can share one.
