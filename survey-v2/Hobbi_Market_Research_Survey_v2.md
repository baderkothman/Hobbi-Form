# Hobbi — Complete Clubs & Explorers Market Research Survey (v2)

## Form overview

**Survey title:** Hobbi — Clubs & Explorers Research / استطلاع الأندية والمشاركين

**Purpose:** Understand Lebanese explorers' and club organizers' existing behavior, pain points, feature needs, booking practices and adoption intent, and test the Tripoli pilot. The survey is not a product signup or a commitment to pay.

**Context:** The pilot runs in Tripoli only. The survey collects every Lebanese city so Tripoli can be compared with the rest and the next city can be chosen. Booking updates will go out by WhatsApp and email. Pro is a club subscription; $9, $15 and $19 per month are under test.

**Eligibility:** Voluntary; no automatic email collection. Adults can answer as explorers or club organizers. Under-18s can answer as explorers only: they never see the club option, the contact opt-ins or the 18+ age ranges, so no contact details are collected from them. Every contact field is optional and shown only after an explicit opt-in.

**Flow:** Age → consent → (adults) choose Explorer or Club → city, with Tripoli and non-Tripoli routes → corresponding questions → (adults) optional opt-ins → submit.

**Questions:** Explorer 24 (a respondent sees at most 23); Club 27 (at most 26).

**Estimated completion:** Explorer about 6–8 minutes; Club about 8–10 minutes. See the change log for how this was estimated.

**IDs:** Questions that survive from v1 keep their IDs so results stay comparable. New questions take new IDs (E18–E24, C24–C30) or a letter suffix for the city routes (E01a, E01b, C01a, C01b). Removed IDs (E08, E11, E14, C04, C10, C14, C18, C19) are never reused.

## Routing at a glance

| After | Answer | Goes to |
|---|---|---|
| S01 age | 18 or older | S02 (consent) |
| S01 age | Under 18 | S03 (consent for under-18s) |
| S02 consent | Yes | S04 (audience) |
| S03 consent | Yes | E01: under-18s are explorers only |
| S02 or S03 consent | No | Exit screen, then submit |
| S04 audience | Explorer | E01 |
| S04 audience | Club organizer | C01 |
| E01 | Tripoli | E01a, then E02 |
| E01 | Any other area | E01b, then E02 |
| S05 age check (Google Form only) | 18 or older | E21 |
| S05 age check (Google Form only) | Under 18 | E24, skipping the opt-ins and E23 |
| E21 invite | Yes, invite me | E22 (WhatsApp number), then E16 |
| E21 invite | No, thanks | E16 |
| E16 interview | Yes, I opt in | E17 (contact), then E23 |
| E16 interview | No | E23 |
| E23–E24 | — | Submit |
| C01 | Tripoli | C01a, then C24 |
| C01 | Any other answer, including “Several cities” | C01b, then C24 |
| C27 participants pay | Always or Sometimes | C28–C29, then C05 |
| C27 participants pay | Never | C05 |
| C13 pilot | Yes or Maybe | C30 (WhatsApp number), then C22 |
| C13 pilot | No | C22 |
| C22 interview | Yes, I opt in | C23 (contact), then submit |
| C22 interview | No | Submit |

# Screening and routing

## Section: Before you begin / قبل أن تبدأ

### S01. Are you 18 or older?
هل عمرك 18 عاماً أو أكثر؟

_Changed in v2: Was "Are you 18 or older, and do you agree to take part in this research?" Age and consent are now separate, and under-18s continue._

**Type:** mc | **Required:** Yes

**Routing:** “Yes, I'm 18 or older” → S02; “No, I'm under 18” → S03

- Yes, I'm 18 or older / نعم، عمري 18 عاماً أو أكثر
- No, I'm under 18 / لا، عمري أقل من 18 عاماً

## Section: Before you begin / قبل أن تبدأ

### S02. Do you agree to take part in this research?
هل توافق على المشاركة في هذا البحث؟

_New in v2._

**Type:** mc | **Required:** Yes | **Shown if:** S01 = “Yes, I'm 18 or older”

**Routing:** “Yes, I agree” → S04; “No” → exit screen

- Yes, I agree / نعم، أوافق
- No / لا

## Section: Before you begin / قبل أن تبدأ

### S03. You're under 18, so you'll answer the explorer questions, and we won't ask for any contact details. Do you agree to take part?
عمرك أقل من 18 عاماً، لذا ستجيب عن أسئلة المشاركين، ولن نطلب منك أي معلومات تواصل. هل توافق على المشاركة؟

_New in v2._

**Type:** mc | **Required:** Yes | **Shown if:** S01 = “No, I'm under 18”

**Routing:** “Yes, I agree” → E01; “No” → exit screen

- Yes, I agree / نعم، أوافق
- No / لا

## Section: About you / عنك

### S04. Which describes you?
أي وصف ينطبق عليك؟

_Changed in v2: Was S02. Only adults see it._

**Type:** mc | **Required:** Yes | **Shown if:** S02 = “Yes, I agree”

**Routing:** “Explorer: I attend activities or want to try new hobbies” → E01; “Club organizer: I run or help run a club” → C01

**Hint:** If you're both, submit the form twice: once for each. / إذا كان الوصفان ينطبقان عليك، أرسل النموذج مرتين: مرة لكل وصف.

- Explorer: I attend activities or want to try new hobbies / مشارك: أحضر أنشطة أو أرغب في تجربة هوايات جديدة
- Club organizer: I run or help run a club / منظم نادٍ: أدير نادياً أو أساعد في إدارته

# Explorer survey / استطلاع المشاركين

## Section: Where you take part / أين تشارك

### E01. Where do you usually attend activities?
أين تشارك عادةً في الأنشطة؟

_Changed in v2: Now routes: Tripoli to E01a, every other answer to E01b._

**Type:** mc | **Required:** Yes

**Routing:** “Tripoli” → E01a; any other answer → E01b

- Beirut / بيروت
- Tripoli / طرابلس
- Batroun / البترون
- Jounieh–Keserwan / جونية–كسروان
- Jbeil / جبيل
- South Lebanon / جنوب لبنان
- Bekaa / البقاع
- Other area / منطقة أخرى

## Section: Tripoli / طرابلس

### E01a. Which part of Tripoli?
في أي منطقة من طرابلس؟

_New in v2._

**Type:** mc | **Required:** Yes | **Shown if:** E01 = “Tripoli”

- Al Mina / الميناء
- Dam w Farez / الضم والفرز
- Bahsas / البحصاص
- Abu Samra / أبي سمرا
- Old City / المدينة القديمة
- Tal / التل
- Other / أخرى

## Section: Tripoli / طرابلس

### E01b. Would you travel to Tripoli for an activity?
هل تقبل الذهاب إلى طرابلس للمشاركة في نشاط؟

_New in v2._

**Type:** mc | **Required:** Yes | **Shown if:** E01 is any answer except “Tripoli”

- Yes, regularly / نعم، بانتظام
- Occasionally, for something special / أحياناً، لنشاط مميز
- No / لا

## Section: Your activities / أنشطتك

### E02. How many organized activities did you attend during the past 3 months?
كم نشاطاً منظماً حضرت خلال آخر 3 أشهر؟

**Type:** mc | **Required:** Yes

- None / ولا نشاط
- 1 / نشاط واحد
- 2–3 / من 2 إلى 3
- 4–6 / من 4 إلى 6
- 7+ / 7 أو أكثر

### E20. In the past 3 months, how often did you sign up for an activity and not go?
خلال آخر 3 أشهر، كم مرة سجّلت في نشاط ولم تحضر؟

_New in v2._

**Type:** mc | **Required:** Yes

- Never / أبداً
- Once / مرة واحدة
- 2–3 times / 2–3 مرات
- More than 3 times / أكثر من 3 مرات
- I don't sign up in advance / لا أسجّل مسبقاً

### E03. Where do you currently find activities? (Select up to 3)
كيف تجد الأنشطة حالياً؟ (اختر حتى 3)

_Changed in v2: "Club pages" renamed to "Club Instagram/Facebook pages"; "Event websites or apps" added._

**Type:** checkbox | **Required:** Yes | **Maximum selections:** 3

- Instagram / إنستغرام
- WhatsApp / واتساب
- Facebook / فيسبوك
- TikTok / تيك توك
- Friends or family / الأصدقاء أو العائلة
- Google / غوغل
- Club Instagram/Facebook pages / صفحات الأندية على إنستغرام أو فيسبوك
- Event websites or apps / مواقع أو تطبيقات الفعاليات
- I rarely search / نادراً ما أبحث

## Section: What you look for / ما الذي تبحث عنه

### E04. What prevents you from joining more activities? (Up to 3)
ما الذي يمنعك من المشاركة أكثر؟ (حتى 3)

**Type:** checkbox | **Required:** Yes | **Maximum selections:** 3

- Difficult to find activities / صعب إيجاد الأنشطة
- Unclear prices/details / الأسعار أو المعلومات غير واضحة
- Inconvenient times / المواعيد غير مناسبة
- Too expensive / مكلفة
- Transport or distance / المواصلات أو المسافة
- Complicated booking / الحجز معقد
- No one to go with / لا أحد يرافقني
- Safety or trust concerns / مخاوف الأمان أو الثقة
- Nothing in particular / لا شيء محدد

### E05. Which experiences interest you? (Up to 3)
ما الأنشطة التي تهمك؟ (حتى 3)

**Type:** checkbox | **Required:** Yes | **Maximum selections:** 3

- Art, crafts, pottery / الفن والأشغال والفخار
- Sports or fitness / الرياضة أو اللياقة
- Hiking or nature / المشي الجبلي والطبيعة
- Music / الموسيقى
- Games or gaming / الألعاب
- Workshops or learning / ورش العمل والتعلم
- Wellness or yoga / العافية واليوغا
- Social gatherings / اللقاءات الاجتماعية

### E06. What do you typically spend per person on one activity? (USD equivalent)
كم تنفق عادةً للشخص الواحد على نشاط واحد؟ (ما يعادل الدولار)

**Type:** mc | **Required:** Yes

- Free / مجاني
- Below $10 / أقل من 10$
- $10–19 / 10–19$
- $20–39 / 20–39$
- $40+ / 40$ أو أكثر
- It varies / يختلف

### E07. How long would you travel to reach an activity?
ما الوقت الذي تقبل قطعه للوصول إلى نشاط؟

_Changed in v2: English was "How far would you travel for an activity?"_

**Type:** mc | **Required:** Yes

- Up to 15 minutes / حتى 15 دقيقة
- 16–30 minutes / 16–30 دقيقة
- 31–60 minutes / 31–60 دقيقة
- More than 60 minutes / أكثر من ساعة
- Depends / حسب النشاط

## Section: How you like to join / كيف تحب أن تشارك

### E09. How do you prefer to attend activities?
كيف تفضل المشاركة في الأنشطة؟

**Type:** mc | **Required:** Yes

- Alone and meet people / وحدي لأتعرف إلى أشخاص
- With friends / مع الأصدقاء
- Either / كلاهما
- I rarely attend / نادراً ما أحضر

### E10. Would you accept waiting for club approval before a booking is confirmed?
هل تقبل انتظار موافقة النادي قبل تأكيد الحجز؟

**Type:** mc | **Required:** Yes

- Yes, within a few hours / نعم خلال ساعات
- Yes, within 24 hours / نعم خلال 24 ساعة
- I prefer instant confirmation / أفضل التأكيد الفوري
- Depends on the activity / حسب النشاط

### E18. How do you prefer to get booking updates?
كيف تفضّل أن تصلك تحديثات الحجز؟

_New in v2._

**Type:** mc | **Required:** Yes

- WhatsApp / واتساب
- SMS / رسالة نصية (SMS)
- Email / بريد إلكتروني
- App notification / إشعار من التطبيق

### E19. Which phone do you use?
ما نوع الهاتف الذي تستخدمه؟

_New in v2._

**Type:** mc | **Required:** Yes

- iPhone / آيفون
- Android / أندرويد
- Other / غير ذلك

## Section: An app like Hobbi / تطبيق مثل Hobbi

### E12. Which app features would be most useful? (Up to 3)
ما ميزات التطبيق الأكثر فائدة لك؟ (حتى 3)

_Changed in v2: Added "WhatsApp group updates from clubs" and "None of these"._

**Type:** checkbox | **Required:** Yes | **Maximum selections:** 3

- Discover nearby activities / اكتشاف أنشطة قريبة
- See schedules, details and prices / عرض المواعيد والتفاصيل والأسعار
- Request bookings / طلب الحجز
- Join club communities / الانضمام للمجتمعات
- WhatsApp group updates from clubs / تحديثات مجموعات واتساب من الأندية
- Chat with people / مراسلة الأشخاص
- Verified club profiles / صفحات الأندية الموثوقة
- Reviews from attendees / تقييمات المشاركين
- Posts and stories / المنشورات والقصص
- Notifications / الإشعارات
- None of these / لا شيء مما سبق

### E13. What would worry you about such an app? (Up to 3)
ما الأمور التي قد تقلقك في تطبيق كهذا؟ (حتى 3)

**Type:** checkbox | **Required:** Yes | **Maximum selections:** 3

- Privacy / الخصوصية
- Untrustworthy organizers / منظّمون غير موثوقين
- Spam or unwanted contact / رسائل مزعجة
- Few local activities / قلة الأنشطة القريبة
- Unclear cancellations / عدم وضوح الإلغاء
- Unexpected costs / تكاليف مفاجئة
- No concerns / لا مخاوف

### E15. What, if anything, would make an app like Hobbi useful to you?
ما الذي قد يجعل تطبيقاً مثل Hobbi مفيداً لك، إن وُجد؟

_Changed in v2: Was "What would make an app like Hobbi genuinely useful to you?"_

**Type:** paragraph | **Required:** No

**Answer:** Free text, up to 1,000 characters.

## Section: Staying in touch / البقاء على تواصل

### S05. Just to double-check: are you 18 or older?
للتأكد فقط: هل عمرك 18 عاماً أو أكثر؟

_New in v2._

**Type:** mc | **Required:** Yes

**Routing:** “Yes, I'm 18 or older” → E21; “No, I'm under 18” → E24

**Hint:** We ask again because the form can't remember your first answer. / نسأل مجدداً لأن النموذج لا يتذكر إجابتك الأولى.

- Yes, I'm 18 or older / نعم، عمري 18 عاماً أو أكثر
- No, I'm under 18 / لا، عمري أقل من 18 عاماً

## Section: Launch invite / دعوة الإطلاق

### E21. Want an invite to try Hobbi when it launches in your city?
هل تريد دعوة لتجربة Hobbi عند إطلاقه في مدينتك؟

_New in v2._

**Type:** mc | **Required:** Yes | **Shown if:** S05 = “Yes, I'm 18 or older” (in the web app: S01)

**Routing:** “Yes, invite me” → E22; “No, thanks” → E16

- Yes, invite me / نعم، أرسلوا لي دعوة
- No, thanks / لا، شكراً

## Section: Your WhatsApp number / رقم واتساب

### E22. Leave your WhatsApp number for the invite
اترك رقم واتساب لنرسل لك الدعوة

_New in v2._

**Type:** text | **Required:** No | **Shown if:** E21 = “Yes, invite me”

**Hint:** Optional. We'll only use it to send the launch invite. / اختياري. سنستخدمه فقط لإرسال دعوة الإطلاق.

**Answer:** WhatsApp number (digits, spaces, +, brackets and dashes).

## Section: Follow-up interview / مقابلة متابعة

### E16. May we contact you for a short follow-up interview?
هل توافق على أن نتواصل معك لإجراء مقابلة قصيرة؟

_Changed in v2: Was "…for a follow-up interview or pilot invitation?"_

**Type:** mc | **Required:** Yes | **Shown if:** S05 = “Yes, I'm 18 or older” (in the web app: S01)

**Routing:** “Yes, I opt in” → E17; “No” → E23

- Yes, I opt in / نعم أوافق
- No / لا

## Section: Contact details / معلومات التواصل

### E17. Optional contact for the follow-up interview: your WhatsApp number, or email if you prefer
معلومات تواصل اختيارية لمقابلة المتابعة: رقم واتساب، أو بريد إلكتروني إن كنت تفضّل

_Changed in v2: Was "Optional contact if you opted in (email or Instagram)". Asks for WhatsApp first; Instagram is no longer accepted._

**Type:** text | **Required:** No | **Shown if:** E16 = “Yes, I opt in”

**Hint:** If you already left your WhatsApp number above, you can leave this blank. / إذا تركت رقم واتساب أعلاه، يمكنك ترك هذا الحقل فارغاً.

**Answer:** WhatsApp number or email address.

## Section: About you (optional) / عنك (اختياري)

### E23. Your age range
فئتك العمرية

_New in v2._

**Type:** mc | **Required:** No | **Shown if:** S05 = “Yes, I'm 18 or older” (in the web app: S01)

- 18–24
- 25–34
- 35–44
- 45+ / 45 أو أكثر

## Section: About you (optional) / عنك (اختياري)

### E24. Your gender
الجنس

_New in v2._

**Type:** mc | **Required:** No

- Woman / امرأة
- Man / رجل
- Prefer not to say / أفضّل عدم الإجابة

# Club organizer survey / استطلاع الأندية

## Section: Your club / ناديكم

### C01. Where is your club mainly active?
أين ينشط ناديكم بشكل أساسي؟

_Changed in v2: Now routes: Tripoli to C01a, every other answer (including "Several cities") to C01b._

**Type:** mc | **Required:** Yes

**Routing:** “Tripoli” → C01a; any other answer → C01b

- Beirut / بيروت
- Tripoli / طرابلس
- Batroun / البترون
- Jounieh–Keserwan / جونية–كسروان
- Jbeil / جبيل
- South Lebanon / جنوب لبنان
- Bekaa / البقاع
- Several cities / مدن متعددة
- Other / أخرى

## Section: Tripoli / طرابلس

### C01a. Which part of Tripoli is your club based in?
في أي منطقة من طرابلس يقع ناديكم؟

_New in v2._

**Type:** mc | **Required:** Yes | **Shown if:** C01 = “Tripoli”

- Al Mina / الميناء
- Dam w Farez / الضم والفرز
- Bahsas / البحصاص
- Abu Samra / أبي سمرا
- Old City / المدينة القديمة
- Tal / التل
- Other / أخرى

## Section: Tripoli / طرابلس

### C01b. Would you run activities in Tripoli or list them for Tripoli participants?
هل قد تنظّمون أنشطة في طرابلس، أو تعرضون أنشطتكم للمشاركين من طرابلس؟

_New in v2._

**Type:** mc | **Required:** Yes | **Shown if:** C01 is any answer except “Tripoli”

- We already run activities in Tripoli / ننظّم أنشطة في طرابلس حالياً
- Yes, we'd run activities in Tripoli / نعم، قد ننظّم أنشطة في طرابلس
- We'd only list our activities for people from Tripoli / قد نعرض أنشطتنا فقط للمشاركين من طرابلس
- Not sure / غير متأكد
- No / لا

## Section: Your activities / أنشطتكم

### C24. How long has your club been running?
منذ متى ينشط ناديكم؟

_New in v2._

**Type:** mc | **Required:** Yes

- Under 6 months / أقل من 6 أشهر
- 6–12 months / 6–12 شهراً
- 1–3 years / 1–3 سنوات
- More than 3 years / أكثر من 3 سنوات

### C02. What kind of activities do you organize?
ما نوع الأنشطة التي تنظمونها؟

**Type:** checkbox | **Required:** Yes

- Sports and fitness / رياضة ولياقة
- Outdoor and hiking / أنشطة خارجية ومشي جبلي
- Arts and crafts / فنون وأشغال
- Music and entertainment / موسيقى وترفيه
- Games and social events / ألعاب ولقاءات
- Workshops and learning / ورش عمل وتعلم
- Wellness / عافية
- Other / أخرى

### C03. How many activities do you organize per month?
كم نشاطاً تنظمون في الشهر؟

**Type:** mc | **Required:** Yes

- 0–1
- 2–3
- 4–7
- 8+ / 8 أو أكثر
- Seasonal / موسمي

### C25. For your last activity, how many people signed up?
في آخر نشاط نظّمتموه، كم شخصاً سجّل؟

_New in v2._

**Type:** number | **Required:** No

**Hint:** Your best estimate. Leave blank if you don't take sign-ups. / يكفي تقدير تقريبي. اتركه فارغاً إذا كنتم لا تستقبلون تسجيلات.

**Answer:** Whole number.

### C26. …and how many actually came?
…وكم شخصاً حضر فعلاً؟

_New in v2._

**Type:** number | **Required:** No

**Hint:** Your best estimate. / يكفي تقدير تقريبي.

**Answer:** Whole number.

## Section: Payments / الدفع

### C27. Do participants pay for your activities?
هل يدفع المشاركون مقابل أنشطتكم؟

_New in v2._

**Type:** mc | **Required:** Yes

**Routing:** “Always” or “Sometimes” → C28; “Never” → C05

- Always / دائماً
- Sometimes / أحياناً
- Never / أبداً

## Section: Prices and payment / الأسعار وطرق الدفع

### C28. Typical price per person (USD equivalent)
السعر المعتاد للشخص الواحد (ما يعادل الدولار)

_New in v2._

**Type:** mc | **Required:** Yes | **Shown if:** C27 = “Always” or “Sometimes”

- Below $10 / أقل من 10$
- $10–19 / 10–19$
- $20–39 / 20–39$
- $40+ / 40$ أو أكثر
- It varies / يختلف

### C29. How do participants pay?
كيف يدفع المشاركون؟

_New in v2._

**Type:** checkbox | **Required:** Yes | **Shown if:** C27 = “Always” or “Sometimes”

- Cash / نقداً
- Whish
- OMT
- Bank transfer / تحويل مصرفي
- Card / بطاقة
- Other / أخرى

## Section: Promotion and bookings / الترويج والحجوزات

### C05. Where do you promote activities today?
أين تروجون للأنشطة حالياً؟

**Type:** checkbox | **Required:** Yes

- Instagram / إنستغرام
- WhatsApp / واتساب
- Facebook / فيسبوك
- TikTok / تيك توك
- Website / موقع إلكتروني
- Referrals / توصيات
- Other / أخرى

### C06. How do you receive and track booking requests?
كيف تستقبلون وتتابعون طلبات الحجز؟

**Type:** checkbox | **Required:** Yes

- Instagram messages / رسائل إنستغرام
- WhatsApp / واتساب
- Google Forms or Sheets / نماذج أو جداول غوغل
- Website or booking software / موقع أو نظام حجوزات
- Phone calls / مكالمات
- Manual lists / قوائم يدوية
- Other / أخرى

### C07. What are your top operational challenges? (Up to 3)
ما أبرز تحديات الإدارة لديكم؟ (حتى 3)

**Type:** checkbox | **Required:** Yes | **Maximum selections:** 3

- Attracting participants / جذب المشاركين
- Tracking booking requests / متابعة الحجوزات
- Cancellations and no-shows / الإلغاء والغياب
- Communicating updates / إيصال التحديثات
- Managing members / إدارة الأعضاء
- Scheduling activities / جدولة الأنشطة
- Managing staff / إدارة الفريق
- Understanding results / فهم النتائج
- None / لا توجد

### C08. Do you approve participants before confirming activity bookings?
هل توافقون على المشاركين قبل تأكيد الحجز؟

**Type:** mc | **Required:** Yes

- Always / دائماً
- Sometimes / أحياناً
- Never / أبداً
- Depends / حسب النشاط

### C09. Roughly how much time do you or your team spend on bookings and coordination each week?
كم من الوقت تقضون أنتم أو فريقكم أسبوعياً في الحجوزات والتنسيق تقريباً؟

_Changed in v2: "your team" became "you or your team"._

**Type:** mc | **Required:** Yes

- Under 2 hours / أقل من ساعتين
- 2–5 hours / 2–5 ساعات
- 6–10 hours / 6–10 ساعات
- 10+ hours / أكثر من 10 ساعات
- Unsure / غير متأكد

## Section: Tools / الأدوات

### C11. Which platform features would help your club most? (Up to 3)
ما الميزات الأكثر مساعدة لناديكم؟ (حتى 3)

_Changed in v2: Added "None of these"._

**Type:** checkbox | **Required:** Yes | **Maximum selections:** 3

- Public club profile / صفحة عامة للنادي
- Activity listings / نشر الأنشطة
- Booking approvals / الموافقة على الحجوزات
- Member management / إدارة الأعضاء
- Messaging and updates / المراسلة والتحديثات
- Automated reminders / تذكيرات تلقائية
- Waitlists / قوائم انتظار
- Analytics / تحليلات
- Staff accounts / حسابات الموظفين
- None of these / لا شيء مما سبق

### C12. What would most prevent you from adopting a new platform?
ما أكثر شيء قد يمنعكم من اعتماد منصة جديدة؟

**Type:** mc | **Required:** Yes

- Setup takes too much time / الإعداد يستغرق وقتاً
- Members would not use it / لن يستخدمها الأعضاء
- Price / السعر
- Privacy or data concerns / مخاوف الخصوصية
- Missing integrations / نقص التكامل
- Current tools are sufficient / الأدوات الحالية كافية
- Other / أخرى

### C15. What do you currently pay monthly for club-management software? (USD equivalent)
كم تدفعون شهرياً حالياً لبرامج إدارة النادي؟ (بالدولار أو ما يعادله)

_Changed in v2: Absorbs C10. First option was "$0"; it is now "$0, we don't pay"._

**Type:** mc | **Required:** Yes

- $0, we don't pay / صفر، لا ندفع
- Below $10 / أقل من 10$
- $10–29 / 10–29$
- $30–59 / 30–59$
- $60+ / 60$ أو أكثر
- Unsure / prefer not to say / غير متأكد / أفضل عدم الإجابة

## Section: Pricing and decisions / الأسعار والقرارات

### C16. What monthly price would you consider fair for tools that save your club time?
ما السعر الشهري الذي تعتبرونه عادلاً لأدوات توفّر الوقت على ناديكم؟

_Changed in v2: Was "If advanced tools solved real problems, what monthly subscription price would be acceptable?" with bands $1–9 to $30+._

**Type:** mc | **Required:** Yes

- Free only / مجاني فقط
- $9 / 9$
- $15 / 15$
- $19 / 19$
- More than $19 / أكثر من 19$
- Not sure / غير متأكد

### C17. Which Pro features, if any, are worth paying for? (Up to 3)
أي مزايا Pro قد تستحق الدفع؟ (حتى 3)

**Type:** checkbox | **Required:** Yes | **Maximum selections:** 3

- Advanced analytics / تحليلات متقدمة
- Automatic reminders / تذكيرات تلقائية
- Waitlist management / إدارة الانتظار
- Recurring schedules / جداول متكررة
- More staff accounts / حسابات إضافية
- Participant export / تصدير المشاركين
- Priority support / دعم أولوية
- None / لا شيء

## Section: Final thoughts / أفكار أخيرة

### C20. What, if anything, would Hobbi need to do better than your current tools to earn your trust?
ما الذي يجب أن يقدمه Hobbi بشكل أفضل من أدواتكم الحالية ليكسب ثقتكم، إن وُجد؟

_Changed in v2: Added "if anything"._

**Type:** paragraph | **Required:** No

**Answer:** Free text, up to 1,000 characters.

### C21. Optional public club name or Instagram handle
اسم النادي أو حساب إنستغرام العام (اختياري)

**Type:** text | **Required:** No

**Answer:** Free text, up to 120 characters.

## Section: Pilot / التجربة

### C13. Would you like to join the free 8-week pilot? We will contact you on WhatsApp.
هل ترغبون في المشاركة في التجربة المجانية لمدة 8 أسابيع؟ سنتواصل معكم عبر واتساب.

_Changed in v2: Was "Would you consider joining a free 8-week pilot?" Now absorbs the new pilot commitment question, moved to the end, and leads to C30._

**Type:** mc | **Required:** Yes

**Routing:** “Yes” or “Maybe, tell me more” → C30; “No” → C22

**Hint:** The pilot runs in Tripoli. / تجري التجربة في طرابلس.

- Yes / نعم
- Maybe, tell me more / ربما، أخبرونا المزيد
- No / لا

## Section: Your WhatsApp number / رقم واتساب

### C30. Your WhatsApp number for the pilot
رقم واتساب للتواصل بخصوص التجربة

_New in v2._

**Type:** text | **Required:** No | **Shown if:** C13 = “Yes” or “Maybe, tell me more”

**Hint:** Optional. We'll only use it to contact you about the pilot. / اختياري. سنستخدمه فقط للتواصل معكم بخصوص التجربة.

**Answer:** WhatsApp number (digits, spaces, +, brackets and dashes).

## Section: Research interview / مقابلة بحثية

### C22. May we contact you for a short research interview?
هل توافقون على أن نتواصل معكم لإجراء مقابلة بحثية قصيرة؟

_Changed in v2: Was "May we contact you about interviews or the pilot?"_

**Type:** mc | **Required:** Yes

**Routing:** “Yes, I opt in” → C23; “No” → submit

- Yes, I opt in / نعم أوافق
- No / لا

## Section: Contact details / معلومات التواصل

### C23. Optional contact for the research interview: your WhatsApp number, or email if you prefer
معلومات تواصل اختيارية للمقابلة البحثية: رقم واتساب، أو بريد إلكتروني إن كنتم تفضّلون

_Changed in v2: Was "Optional contact if you opted in (email or phone)". Asks for WhatsApp first._

**Type:** text | **Required:** No | **Shown if:** C22 = “Yes, I opt in”

**Hint:** If you already left your WhatsApp number for the pilot, you can leave this blank. / إذا تركتم رقم واتساب للتجربة، يمكنكم ترك هذا الحقل فارغاً.

**Answer:** WhatsApp number or email address.

# Research analysis and decision guide

## Before you look at any results

- **Clean the sheet.** Drop rows where S02 or S03 is “No”. Google Forms can't end a form without submitting, so people who decline still leave a row holding only their screening answers.
- **Separate under-18s.** S01 = “No, I'm under 18” marks them (the app stores `respondent_adult = false`). Hobbi is for adults, so the decision rules below use adults only; report under-18s as their own group. If S05 contradicts S01, trust S01.
- **Separate contact details.** Copy E17, E22, C23 and C30 into a separate, restricted sheet, then delete those columns from every copy used for analysis or shared with anyone. Use a number only for the purpose the person agreed to (launch invite, pilot or interview), and delete contact details once that purpose is over.
- **Define “Tripoli”.** A Tripoli explorer answered E01 = Tripoli. A Tripoli club answered C01 = Tripoli, or C01b = “We already run activities in Tripoli”.
- **Write the decision rules down now (below) and don't change them after seeing data.**

## Report Tripoli and other cities separately

**Decide the pilot on Tripoli answers only.** Answers from other cities never count towards a pilot decision.

**Use other cities to rank the next city to open.** Compare cities on:

1. Number of explorer responses.
2. Share who left a WhatsApp number for the launch invite (E22).
3. Recent participation (E02).
4. Clubs from that city willing to list or run activities (C01b, C13 with C30).

Report counts next to percentages. A city with 6 respondents can't be ranked against one with 40.

For explorers outside Tripoli, also report E01b: how many would travel to Tripoli. That is the pilot's reach beyond the city.

## Targets

| Group | Target |
|---|---|
| Adult Tripoli explorers | 50+ |
| Adult explorers from other cities | ~50 |
| Tripoli club responses | As many as possible |
| Club interviews | 10–15 |

With about 50 Tripoli explorers, a percentage carries a margin of error near ±14 points. Treat any result within 10 points of a decision threshold as inconclusive, and settle it in interviews. Club samples will be smaller still, so club percentages are directional only.

## Decision rules (fixed before results come in)

All rules use adult Tripoli respondents only.

| # | If… | Then… |
|---|---|---|
| 1 | Over 50% of Tripoli explorers choose “I prefer instant confirmation” in E10 | Review the approval-based booking model. |
| 2 | WhatsApp is not the most chosen channel in E18 | Revisit the notification plan. |
| 3 | Most Tripoli clubs (over 50%) choose “Free only” or “$9” in C16 | Test Pro at $9–15 first. |
| 4 | Over 30% of Tripoli explorers report 2+ no-shows in E20 (“2–3 times” or “More than 3 times”) | Plan reminders for the Free tier, not only Pro. |

For rule 4, leave out explorers who chose “I don't sign up in advance”: they can't miss a booking. Report the figure with and without them. Cross-check with the club side: the share of sign-ups who didn't come, from C25 and C26. Walk-ins can make C26 larger than C25. That is valid data, not an error.

## What to track

**Explorers:** Segment by city and Tripoli area (E01, E01a). Track:

- Willingness to travel to Tripoli (E01b)
- Recent participation and no-shows (E02, E20)
- Discovery channels (E03)
- Pain points (E04)
- Interests (E05)
- Typical spending (E06)
- Approval tolerance (E10)
- Preferred update channel and phone (E18, E19)
- Preferred features (E12)
- Launch-invite commitment (E21, E22)

Use age and gender (E23, E24) only to check how representative the sample is, and never report them for groups smaller than 5. Under-18s don't see E23, so count them from S01.

**Clubs:** Compare:

- Location and reach into Tripoli (C01, C01a, C01b)
- Club age (C24)
- Activity volume and size (C03, C25, C26)
- Whether and how participants pay (C27–C29)
- Booking workflow (C06)
- Operational pain (C07)
- Time spent (C09)
- Current software spend (C15)
- Fair Pro price (C16)
- Reasons to pay (C17)
- Pilot commitment (C13 with C30)

**Commitment over intent:** The strongest signals are actions: a WhatsApp number left in E22 or C30. Report “said yes” and “left a number” separately.

## Comparing with v1 responses

Kept questions with unchanged options compare directly. The change log flags the rest:

- **C13 changed meaning:** it asked about considering the pilot and now asks to join.
- **C16 changed options:** the price points differ.
- **E16 and C22 now cover interviews only:** in v1 they also covered the pilot.
- **E03, E12 and C11 gained options:** these shift the distribution slightly.

Don't pool these with v1 answers.

**Important:** Intent to try or pay is not evidence of actual adoption or revenue. Follow up with real onboarding, booking, attendance and paid subscription trials.

**Research ethics:** Share aggregated results, not individual contact details. Use contact fields only when the respondent opted in, and remove any contact information given without consent. Test every route (the table above) before sending.
