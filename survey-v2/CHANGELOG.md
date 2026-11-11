# Hobbi survey v2: change log

Every question added, removed or changed from v1, and why. IDs that survive from v1 are unchanged, and removed IDs are never reused.

## Added (21)

| ID | Question | Why |
| --- | --- | --- |
| S02 | Do you agree to take part in this research? | Consent for adults, asked on its own after age. |
| S03 | You're under 18, so you'll answer the explorer questions, and we won't ask for any contact details. Do you agree to take part? | Under-18s can't be club organizers, so they go straight to the explorer questions. |
| E01a | Which part of Tripoli? | The pilot runs in Tripoli, so neighbourhood decides where to recruit clubs first. |
| E01b | Would you travel to Tripoli for an activity? | Shows whether the Tripoli pilot can draw people from other cities. |
| E20 | In the past 3 months, how often did you sign up for an activity and not go? | Measures no-shows, which decides whether reminders belong in the Free tier. |
| E18 | How do you prefer to get booking updates? | Booking updates are planned for WhatsApp and email; this checks that plan. |
| E19 | Which phone do you use? | Web notifications and home-screen install behave differently on iPhone and Android. |
| S05 | Just to double-check: are you 18 or older? | Google Forms only: it can't carry S01 forward, so this keeps the launch invite, the interview opt-in and the 18+ age ranges away from under-18s. The web app skips them using S01. |
| E21 | Want an invite to try Hobbi when it launches in your city? | Replaces E14 with a commitment: saying yes and leaving a number (E22) is a stronger signal than a 1–5 rating. |
| E22 | Leave your WhatsApp number for the invite | The commitment half of E21: the share who actually leave a number. |
| E23 | Your age range | Checks whether the sample skews young before results are generalised. Only adults see it. |
| E24 | Your gender | Shows whether trust and safety concerns (E04, E13) differ by gender. |
| C01a | Which part of Tripoli is your club based in? | Matches club locations to where Tripoli explorers live (E01a). |
| C01b | Would you run activities in Tripoli or list them for Tripoli participants? | Finds clubs outside Tripoli that could still supply the pilot. The first option catches "Several cities" clubs already active there. |
| C24 | How long has your club been running? | New and established clubs have different needs and budgets. |
| C25 | For your last activity, how many people signed up? | Paired with C26, gives the club-side no-show rate to compare with E20. |
| C26 | …and how many actually came? | See C25. |
| C27 | Do participants pay for your activities? | Shows whether Hobbi will need to handle paid bookings. |
| C28 | Typical price per person (USD equivalent) | Uses E06's bands (minus "Free") so club prices and explorer spend line up. |
| C29 | How do participants pay? | Payment integrations only matter if participants already pay digitally. |
| C30 | Your WhatsApp number for the pilot | Lets C13's promise to make contact on WhatsApp be kept, and measures commitment. |

## Removed (8)

| ID | Question | Why |
| --- | --- | --- |
| E14 | If useful activities were available near you, how likely are you to try Hobbi? | Hypothetical and inflating: people overstate intent on 1–5 likelihood scales. E21 and E22 measure the same thing as a commitment. |
| C10 | Do you currently pay for software to manage club operations? | Duplicated C15. Its answer is now C15's first option, "$0, we don't pay". |
| C14 | How valuable would club profiles and booking approvals be for your operations? | Hypothetical and leading. C11 ranks the same features against each other, and C13 with C30 measures real interest. |
| C18 | How likely are you to subscribe for $19/month if the Pro tools prove valuable? | Hypothetical and inflating. C16 now asks about $9, $15 and $19 neutrally. |
| E08 | How important is having a verified club organizer? | Cut for length. Importance ratings bunch at the top of the scale, and E04 and E13 already measure trust as a choice against other concerns. |
| E11 | Would you join club communities to receive updates and meet members? | Cut for length. Overlaps E12's "Join club communities" and "WhatsApp group updates from clubs" options. |
| C04 | How many participants typically attend one activity? | Cut for length. C25 and C26 ask about the last activity, which is more precise than a typical-size band. |
| C19 | Who decides whether the club subscribes to paid services? | Cut for length. Better asked in the 10–15 club interviews, where the answer can be followed up. |

## Changed (18)

| ID | Change | Why | Comparable with v1? |
| --- | --- | --- | --- |
| S01 | Was "Are you 18 or older, and do you agree to take part in this research?" Age and consent are now separate, and under-18s continue. | Under-18s can take part as explorers. Asking age on its own also lets each answer lead somewhere different. | No: v1 combined age and consent |
| S04 | Was S02. Only adults see it. | Under-18s skip it: they can only answer as explorers. | Yes: same question, new ID |
| E01 | Now routes: Tripoli to E01a, every other answer to E01b. | Routing for the Tripoli pilot. | Yes |
| E03 | "Club pages" renamed to "Club Instagram/Facebook pages"; "Event websites or apps" added. | "Club pages" was ambiguous, and event apps are the closest existing alternative to Hobbi. | Mostly: two options changed |
| E07 | English was "How far would you travel for an activity?" | The English asked about distance while the Arabic and the options ask about time. | Yes: only the English wording changed |
| E12 | Added "WhatsApp group updates from clubs" and "None of these". | Tests WhatsApp groups against in-app features. "None of these" stops the question assuming some feature is useful. | Mostly: two options added |
| E15 | Was "What would make an app like Hobbi genuinely useful to you?" | The old wording assumed the app could be useful. "If anything" leaves room for "nothing". | Yes, as open text |
| E16 | Was "…for a follow-up interview or pilot invitation?" | The launch invite now has its own consent (E21), so this one covers interviews only. | No: v1 also asked about the pilot |
| E17 | Was "Optional contact if you opted in (email or Instagram)". Asks for WhatsApp first; Instagram is no longer accepted. | WhatsApp is how the team will reach people; email stays as the alternative. | Not applicable (contact details) |
| C01 | Now routes: Tripoli to C01a, every other answer (including "Several cities") to C01b. | Routing for the Tripoli pilot. | Yes |
| C09 | "your team" became "you or your team". | Many clubs are run by one person, who would otherwise answer for a team that doesn't exist. | Yes |
| C11 | Added "None of these". | Without it, every club had to pick a feature, which assumed the platform helps. | Mostly: one option added |
| C15 | Absorbs C10. First option was "$0"; it is now "$0, we don't pay". | C10 asked the same thing as a yes/no. "$0, we don't pay" answers it, so C10 = No maps to this option. | Yes: same bands; v1 C10 = No maps to “$0, we don't pay” |
| C16 | Was "If advanced tools solved real problems, what monthly subscription price would be acceptable?" with bands $1–9 to $30+. | The old premise assumed the tools solve real problems. The options are now the three prices under test. | No: different options |
| C20 | Added "if anything". | Leaves room for clubs happy with their current tools. | Yes, as open text |
| C13 | Was "Would you consider joining a free 8-week pilot?" Now absorbs the new pilot commitment question, moved to the end, and leads to C30. | Replaces the hypothetical C14 and C18 with a real ask. Answers aren't directly comparable with v1's C13, which asked only about consideration. | No: v1 asked about considering, v2 asks to join |
| C22 | Was "May we contact you about interviews or the pilot?" | The pilot now has its own consent (C13), so this one covers interviews only. | No: v1 also asked about the pilot |
| C23 | Was "Optional contact if you opted in (email or phone)". Asks for WhatsApp first. | WhatsApp is how the team will reach clubs; email stays as the alternative. | Not applicable (contact details) |

## Moved

- **C13 (pilot)** moved from the middle of the club survey to the end, beside the other opt-ins. It now asks for a commitment and collects a WhatsApp number, which fits next to the other contact questions.
- **E20 (no-shows)** sits after E02, so both questions about the past 3 months come together.

## Beyond the requested fixes

These follow the brief's own rules, applied to questions it didn't name:

- **No leading questions.**
  - “None of these” added to E12 and C11.
  - “If anything” added to E15 and C20.
  - C13 notes that the pilot runs in Tripoli, so clubs elsewhere don't say yes to something they can't join.
- **Separate consents.** The launch invite (E21), the pilot (C13) and interviews (E16, C22) each have their own opt-in, so a number given for one purpose isn't used for another. E16 and C22 therefore cover interviews only.
- **Commitment measured twice.** “Leave your WhatsApp number” is split into a yes/no (E21) and an optional number (E22). The yes/no is required so the form can route, but “No, thanks” is always available. Comparing the two answers separates stated interest from commitment.
- **Unique titles.** E17 and C23 are titled by interview type. Google Forms uses titles as response-sheet columns, so identical titles would collide.
- **C24 bands.** The last band is “More than 3 years” rather than “3+ years”, so it doesn't overlap “1–3 years”.
- **C28 bands** reuse E06's bands without “Free”, since only clubs that charge see C28.
- **Rule 4's denominator** leaves out explorers who don't sign up in advance, because they can't miss a booking. The guide reports the figure both ways.
- **No progress shown.** The Google Form's progress bar is off and the web app shows no step counter, so people aren't put off by how many questions there are. The consent texts also don't say what each age answer leads to, so nobody is tempted to answer "18 or older" to see more.
- **Under-18s** can take part as explorers, after a separate consent question (S03). They never see the club option, the contact opt-ins (E21, E22, E16, E17) or the 18+ age ranges (E23), so no contact details are collected from them. In the Google Form, S05 re-checks age before the opt-ins because forms can't carry an earlier answer forward; the web app uses S01 throughout.

## Length check

Estimated from typical per-question times on a phone:

| Question type | Time |
|---|---|
| Single choice | 12 s |
| Up to 3 choices | 25 s |
| Number | 15 s |
| Contact field (when shown) | 20 s |
| Open text, answered by about half | 45 s when answered |
| Each section | 4 s |
| Reading the introduction | 45 s |

| Path | Typical | Longest (every optional item answered) | Target |
|---|---|---|---|
| Explorer | 8.1 min | 8.9 min | Under 8 min |
| Club organizer | 9.4 min | 10.2 min | Under 10 min |

Before cutting, the estimate was 7.9 min typical and 8.7 min longest for explorers, and 9.5 and 10.3 min for clubs. That was too close to the targets, so four questions were cut (see Removed): **E08** and **E11** for explorers, **C04** and **C19** for clubs.

Letting under-18s take part added screening: age and consent are now separate questions, and the Google Form re-checks age (S05) before the opt-ins. That adds about 30 seconds, so the typical explorer path is now just over 8 minutes in the Google Form. In the web app, S05 doesn't exist and paths run about 10 seconds shorter.

Run a timed pilot with 3–5 people per path before launch. If it runs long, cut next:

- **Explorers:** E09 (alone or with friends), which isn't tied to any pilot decision.
- **Clubs:** C12 (barriers to adopting a new platform), which interviews can cover.
