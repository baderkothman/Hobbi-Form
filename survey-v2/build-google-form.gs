/**
 * Hobbi — Clubs & Explorers Research (v2): builds the bilingual Google Form.
 *
 * Run it:
 *   1. Open https://script.google.com, choose New project, and replace the code with this file.
 *   2. Choose buildHobbiSurvey in the toolbar, then Run, and approve the permissions.
 *   3. Open the edit link from the execution log. Preview every route in the routing
 *      table of Hobbi_Market_Research_Survey_v2.md before sharing the form.
 *
 * Each run creates a new, separate form in your Google Drive and leaves earlier ones alone.
 *
 * Generated from the same source as Hobbi_Market_Research_Survey_v2.md. If you change
 * questions here, change the Markdown too, or regenerate both.
 */

const PHONE_PATTERN = '^[+]?[0-9٠-٩ ()-]{7,20}$';
const PHONE_OR_EMAIL_PATTERN = '^([+]?[0-9٠-٩ ()-]{7,20}|[^@ ]+@[^@ ]+[.][^@ ]+)$';

const SURVEY = {
  "title": "Hobbi — Clubs & Explorers Research / استطلاع الأندية والمشاركين",
  "description": "Hobbi is a new app for finding hobby activities run by verified clubs. This short research survey asks how you find, join or organize activities today in Lebanon.\nIt takes about 6–8 minutes for explorers and 8–10 minutes for club organizers.\nPrivacy: no login, and we don't collect your email automatically. We only ask for contact details if you choose to hear from us, and you can always skip them. We share aggregated results, never individual contact details.\nThis is research. It isn't a signup or a commitment to pay.\n\nHobbi تطبيق جديد لإيجاد أنشطة وهوايات تنظمها أندية موثوقة. يسألك هذا الاستطلاع البحثي القصير كيف تجد الأنشطة اليوم في لبنان وكيف تشارك فيها أو تنظمها.\nيستغرق نحو 6–8 دقائق للمشاركين و8–10 دقائق لمنظمي الأندية.\nالخصوصية: لا حاجة إلى تسجيل دخول، ولا نجمع بريدك الإلكتروني تلقائياً. لا نطلب معلومات التواصل إلا إذا اخترت أن نتواصل معك، ويمكنك دائماً تخطيها. نشارك النتائج الإجمالية فقط، ولا نشارك معلومات التواصل الفردية أبداً.\nهذا بحث، وليس تسجيلاً في خدمة أو التزاماً بالدفع.",
  "confirmation": "Thank you. Your answers are in. If you're both an explorer and a club organizer, use the link below to answer the other part.\n\nشكراً لك. وصلتنا إجاباتك. إذا كنت مشاركاً ومنظم نادٍ معاً، استخدم الرابط أدناه للإجابة عن الجزء الآخر.",
  "pages": [
    {
      "id": "age",
      "title": "Before you begin / قبل أن تبدأ",
      "questions": [
        {
          "id": "S01",
          "type": "mc",
          "required": true,
          "en": "Are you 18 or older?",
          "ar": "هل عمرك 18 عاماً أو أكثر؟",
          "options": [
            {
              "en": "Yes, I'm 18 or older",
              "ar": "نعم، عمري 18 عاماً أو أكثر"
            },
            {
              "en": "No, I'm under 18",
              "ar": "لا، عمري أقل من 18 عاماً"
            }
          ],
          "branch": {
            "Yes, I'm 18 or older": "consent",
            "No, I'm under 18": "consent-minor"
          }
        }
      ]
    },
    {
      "id": "consent",
      "title": "Before you begin / قبل أن تبدأ",
      "questions": [
        {
          "id": "S02",
          "type": "mc",
          "required": true,
          "en": "Do you agree to take part in this research?",
          "ar": "هل توافق على المشاركة في هذا البحث؟",
          "options": [
            {
              "en": "Yes, I agree",
              "ar": "نعم، أوافق"
            },
            {
              "en": "No",
              "ar": "لا"
            }
          ],
          "branch": {
            "Yes, I agree": "audience",
            "No": "exit"
          }
        }
      ]
    },
    {
      "id": "consent-minor",
      "title": "Before you begin / قبل أن تبدأ",
      "questions": [
        {
          "id": "S03",
          "type": "mc",
          "required": true,
          "en": "You're under 18, so you'll answer the explorer questions, and we won't ask for any contact details. Do you agree to take part?",
          "ar": "عمرك أقل من 18 عاماً، لذا ستجيب عن أسئلة المشاركين، ولن نطلب منك أي معلومات تواصل. هل توافق على المشاركة؟",
          "options": [
            {
              "en": "Yes, I agree",
              "ar": "نعم، أوافق"
            },
            {
              "en": "No",
              "ar": "لا"
            }
          ],
          "branch": {
            "Yes, I agree": "explorer-city",
            "No": "exit"
          }
        }
      ]
    },
    {
      "id": "audience",
      "title": "About you / عنك",
      "questions": [
        {
          "id": "S04",
          "type": "mc",
          "required": true,
          "en": "Which describes you?",
          "ar": "أي وصف ينطبق عليك؟",
          "help": {
            "en": "If you're both, submit the form twice: once for each.",
            "ar": "إذا كان الوصفان ينطبقان عليك، أرسل النموذج مرتين: مرة لكل وصف."
          },
          "options": [
            {
              "en": "Explorer: I attend activities or want to try new hobbies",
              "ar": "مشارك: أحضر أنشطة أو أرغب في تجربة هوايات جديدة"
            },
            {
              "en": "Club organizer: I run or help run a club",
              "ar": "منظم نادٍ: أدير نادياً أو أساعد في إدارته"
            }
          ],
          "branch": {
            "Explorer: I attend activities or want to try new hobbies": "explorer-city",
            "Club organizer: I run or help run a club": "club-city"
          }
        }
      ]
    },
    {
      "id": "explorer-city",
      "title": "Where you take part / أين تشارك",
      "questions": [
        {
          "id": "E01",
          "type": "mc",
          "required": true,
          "en": "Where do you usually attend activities?",
          "ar": "أين تشارك عادةً في الأنشطة؟",
          "options": [
            {
              "en": "Beirut",
              "ar": "بيروت"
            },
            {
              "en": "Tripoli",
              "ar": "طرابلس"
            },
            {
              "en": "Batroun",
              "ar": "البترون"
            },
            {
              "en": "Jounieh–Keserwan",
              "ar": "جونية–كسروان"
            },
            {
              "en": "Jbeil",
              "ar": "جبيل"
            },
            {
              "en": "South Lebanon",
              "ar": "جنوب لبنان"
            },
            {
              "en": "Bekaa",
              "ar": "البقاع"
            },
            {
              "en": "Other area",
              "ar": "منطقة أخرى"
            }
          ],
          "branch": {
            "Tripoli": "explorer-tripoli",
            "*": "explorer-travel"
          }
        }
      ]
    },
    {
      "id": "explorer-tripoli",
      "title": "Tripoli / طرابلس",
      "then": "explorer-activities",
      "questions": [
        {
          "id": "E01a",
          "type": "mc",
          "required": true,
          "en": "Which part of Tripoli?",
          "ar": "في أي منطقة من طرابلس؟",
          "options": [
            {
              "en": "Al Mina",
              "ar": "الميناء"
            },
            {
              "en": "Dam w Farez",
              "ar": "الضم والفرز"
            },
            {
              "en": "Bahsas",
              "ar": "البحصاص"
            },
            {
              "en": "Abu Samra",
              "ar": "أبي سمرا"
            },
            {
              "en": "Old City",
              "ar": "المدينة القديمة"
            },
            {
              "en": "Tal",
              "ar": "التل"
            },
            {
              "en": "Other",
              "ar": "أخرى"
            }
          ]
        }
      ]
    },
    {
      "id": "explorer-travel",
      "title": "Tripoli / طرابلس",
      "questions": [
        {
          "id": "E01b",
          "type": "mc",
          "required": true,
          "en": "Would you travel to Tripoli for an activity?",
          "ar": "هل تقبل الذهاب إلى طرابلس للمشاركة في نشاط؟",
          "options": [
            {
              "en": "Yes, regularly",
              "ar": "نعم، بانتظام"
            },
            {
              "en": "Occasionally, for something special",
              "ar": "أحياناً، لنشاط مميز"
            },
            {
              "en": "No",
              "ar": "لا"
            }
          ]
        }
      ]
    },
    {
      "id": "explorer-activities",
      "title": "Your activities / أنشطتك",
      "questions": [
        {
          "id": "E02",
          "type": "mc",
          "required": true,
          "en": "How many organized activities did you attend during the past 3 months?",
          "ar": "كم نشاطاً منظماً حضرت خلال آخر 3 أشهر؟",
          "options": [
            {
              "en": "None",
              "ar": "ولا نشاط"
            },
            {
              "en": "1",
              "ar": "نشاط واحد"
            },
            {
              "en": "2–3",
              "ar": "من 2 إلى 3"
            },
            {
              "en": "4–6",
              "ar": "من 4 إلى 6"
            },
            {
              "en": "7+",
              "ar": "7 أو أكثر"
            }
          ]
        },
        {
          "id": "E20",
          "type": "mc",
          "required": true,
          "en": "In the past 3 months, how often did you sign up for an activity and not go?",
          "ar": "خلال آخر 3 أشهر، كم مرة سجّلت في نشاط ولم تحضر؟",
          "options": [
            {
              "en": "Never",
              "ar": "أبداً"
            },
            {
              "en": "Once",
              "ar": "مرة واحدة"
            },
            {
              "en": "2–3 times",
              "ar": "2–3 مرات"
            },
            {
              "en": "More than 3 times",
              "ar": "أكثر من 3 مرات"
            },
            {
              "en": "I don't sign up in advance",
              "ar": "لا أسجّل مسبقاً"
            }
          ]
        },
        {
          "id": "E03",
          "type": "checkbox",
          "required": true,
          "maxSelections": 3,
          "en": "Where do you currently find activities? (Select up to 3)",
          "ar": "كيف تجد الأنشطة حالياً؟ (اختر حتى 3)",
          "options": [
            {
              "en": "Instagram",
              "ar": "إنستغرام"
            },
            {
              "en": "WhatsApp",
              "ar": "واتساب"
            },
            {
              "en": "Facebook",
              "ar": "فيسبوك"
            },
            {
              "en": "TikTok",
              "ar": "تيك توك"
            },
            {
              "en": "Friends or family",
              "ar": "الأصدقاء أو العائلة"
            },
            {
              "en": "Google",
              "ar": "غوغل"
            },
            {
              "en": "Club Instagram/Facebook pages",
              "ar": "صفحات الأندية على إنستغرام أو فيسبوك"
            },
            {
              "en": "Event websites or apps",
              "ar": "مواقع أو تطبيقات الفعاليات"
            },
            {
              "en": "I rarely search",
              "ar": "نادراً ما أبحث"
            }
          ]
        }
      ]
    },
    {
      "id": "explorer-preferences",
      "title": "What you look for / ما الذي تبحث عنه",
      "questions": [
        {
          "id": "E04",
          "type": "checkbox",
          "required": true,
          "maxSelections": 3,
          "en": "What prevents you from joining more activities? (Up to 3)",
          "ar": "ما الذي يمنعك من المشاركة أكثر؟ (حتى 3)",
          "options": [
            {
              "en": "Difficult to find activities",
              "ar": "صعب إيجاد الأنشطة"
            },
            {
              "en": "Unclear prices/details",
              "ar": "الأسعار أو المعلومات غير واضحة"
            },
            {
              "en": "Inconvenient times",
              "ar": "المواعيد غير مناسبة"
            },
            {
              "en": "Too expensive",
              "ar": "مكلفة"
            },
            {
              "en": "Transport or distance",
              "ar": "المواصلات أو المسافة"
            },
            {
              "en": "Complicated booking",
              "ar": "الحجز معقد"
            },
            {
              "en": "No one to go with",
              "ar": "لا أحد يرافقني"
            },
            {
              "en": "Safety or trust concerns",
              "ar": "مخاوف الأمان أو الثقة"
            },
            {
              "en": "Nothing in particular",
              "ar": "لا شيء محدد"
            }
          ]
        },
        {
          "id": "E05",
          "type": "checkbox",
          "required": true,
          "maxSelections": 3,
          "en": "Which experiences interest you? (Up to 3)",
          "ar": "ما الأنشطة التي تهمك؟ (حتى 3)",
          "options": [
            {
              "en": "Art, crafts, pottery",
              "ar": "الفن والأشغال والفخار"
            },
            {
              "en": "Sports or fitness",
              "ar": "الرياضة أو اللياقة"
            },
            {
              "en": "Hiking or nature",
              "ar": "المشي الجبلي والطبيعة"
            },
            {
              "en": "Music",
              "ar": "الموسيقى"
            },
            {
              "en": "Games or gaming",
              "ar": "الألعاب"
            },
            {
              "en": "Workshops or learning",
              "ar": "ورش العمل والتعلم"
            },
            {
              "en": "Wellness or yoga",
              "ar": "العافية واليوغا"
            },
            {
              "en": "Social gatherings",
              "ar": "اللقاءات الاجتماعية"
            }
          ]
        },
        {
          "id": "E06",
          "type": "mc",
          "required": true,
          "en": "What do you typically spend per person on one activity? (USD equivalent)",
          "ar": "كم تنفق عادةً للشخص الواحد على نشاط واحد؟ (ما يعادل الدولار)",
          "options": [
            {
              "en": "Free",
              "ar": "مجاني"
            },
            {
              "en": "Below $10",
              "ar": "أقل من 10$"
            },
            {
              "en": "$10–19",
              "ar": "10–19$"
            },
            {
              "en": "$20–39",
              "ar": "20–39$"
            },
            {
              "en": "$40+",
              "ar": "40$ أو أكثر"
            },
            {
              "en": "It varies",
              "ar": "يختلف"
            }
          ]
        },
        {
          "id": "E07",
          "type": "mc",
          "required": true,
          "en": "How long would you travel to reach an activity?",
          "ar": "ما الوقت الذي تقبل قطعه للوصول إلى نشاط؟",
          "options": [
            {
              "en": "Up to 15 minutes",
              "ar": "حتى 15 دقيقة"
            },
            {
              "en": "16–30 minutes",
              "ar": "16–30 دقيقة"
            },
            {
              "en": "31–60 minutes",
              "ar": "31–60 دقيقة"
            },
            {
              "en": "More than 60 minutes",
              "ar": "أكثر من ساعة"
            },
            {
              "en": "Depends",
              "ar": "حسب النشاط"
            }
          ]
        }
      ]
    },
    {
      "id": "explorer-joining",
      "title": "How you like to join / كيف تحب أن تشارك",
      "questions": [
        {
          "id": "E09",
          "type": "mc",
          "required": true,
          "en": "How do you prefer to attend activities?",
          "ar": "كيف تفضل المشاركة في الأنشطة؟",
          "options": [
            {
              "en": "Alone and meet people",
              "ar": "وحدي لأتعرف إلى أشخاص"
            },
            {
              "en": "With friends",
              "ar": "مع الأصدقاء"
            },
            {
              "en": "Either",
              "ar": "كلاهما"
            },
            {
              "en": "I rarely attend",
              "ar": "نادراً ما أحضر"
            }
          ]
        },
        {
          "id": "E10",
          "type": "mc",
          "required": true,
          "en": "Would you accept waiting for club approval before a booking is confirmed?",
          "ar": "هل تقبل انتظار موافقة النادي قبل تأكيد الحجز؟",
          "options": [
            {
              "en": "Yes, within a few hours",
              "ar": "نعم خلال ساعات"
            },
            {
              "en": "Yes, within 24 hours",
              "ar": "نعم خلال 24 ساعة"
            },
            {
              "en": "I prefer instant confirmation",
              "ar": "أفضل التأكيد الفوري"
            },
            {
              "en": "Depends on the activity",
              "ar": "حسب النشاط"
            }
          ]
        },
        {
          "id": "E18",
          "type": "mc",
          "required": true,
          "en": "How do you prefer to get booking updates?",
          "ar": "كيف تفضّل أن تصلك تحديثات الحجز؟",
          "options": [
            {
              "en": "WhatsApp",
              "ar": "واتساب"
            },
            {
              "en": "SMS",
              "ar": "رسالة نصية (SMS)"
            },
            {
              "en": "Email",
              "ar": "بريد إلكتروني"
            },
            {
              "en": "App notification",
              "ar": "إشعار من التطبيق"
            }
          ]
        },
        {
          "id": "E19",
          "type": "mc",
          "required": true,
          "en": "Which phone do you use?",
          "ar": "ما نوع الهاتف الذي تستخدمه؟",
          "options": [
            {
              "en": "iPhone",
              "ar": "آيفون"
            },
            {
              "en": "Android",
              "ar": "أندرويد"
            },
            {
              "en": "Other",
              "ar": "غير ذلك"
            }
          ]
        }
      ]
    },
    {
      "id": "explorer-app",
      "title": "An app like Hobbi / تطبيق مثل Hobbi",
      "questions": [
        {
          "id": "E12",
          "type": "checkbox",
          "required": true,
          "maxSelections": 3,
          "en": "Which app features would be most useful? (Up to 3)",
          "ar": "ما ميزات التطبيق الأكثر فائدة لك؟ (حتى 3)",
          "options": [
            {
              "en": "Discover nearby activities",
              "ar": "اكتشاف أنشطة قريبة"
            },
            {
              "en": "See schedules, details and prices",
              "ar": "عرض المواعيد والتفاصيل والأسعار"
            },
            {
              "en": "Request bookings",
              "ar": "طلب الحجز"
            },
            {
              "en": "Join club communities",
              "ar": "الانضمام للمجتمعات"
            },
            {
              "en": "WhatsApp group updates from clubs",
              "ar": "تحديثات مجموعات واتساب من الأندية"
            },
            {
              "en": "Chat with people",
              "ar": "مراسلة الأشخاص"
            },
            {
              "en": "Verified club profiles",
              "ar": "صفحات الأندية الموثوقة"
            },
            {
              "en": "Reviews from attendees",
              "ar": "تقييمات المشاركين"
            },
            {
              "en": "Posts and stories",
              "ar": "المنشورات والقصص"
            },
            {
              "en": "Notifications",
              "ar": "الإشعارات"
            },
            {
              "en": "None of these",
              "ar": "لا شيء مما سبق"
            }
          ]
        },
        {
          "id": "E13",
          "type": "checkbox",
          "required": true,
          "maxSelections": 3,
          "en": "What would worry you about such an app? (Up to 3)",
          "ar": "ما الأمور التي قد تقلقك في تطبيق كهذا؟ (حتى 3)",
          "options": [
            {
              "en": "Privacy",
              "ar": "الخصوصية"
            },
            {
              "en": "Untrustworthy organizers",
              "ar": "منظّمون غير موثوقين"
            },
            {
              "en": "Spam or unwanted contact",
              "ar": "رسائل مزعجة"
            },
            {
              "en": "Few local activities",
              "ar": "قلة الأنشطة القريبة"
            },
            {
              "en": "Unclear cancellations",
              "ar": "عدم وضوح الإلغاء"
            },
            {
              "en": "Unexpected costs",
              "ar": "تكاليف مفاجئة"
            },
            {
              "en": "No concerns",
              "ar": "لا مخاوف"
            }
          ]
        },
        {
          "id": "E15",
          "type": "paragraph",
          "required": false,
          "en": "What, if anything, would make an app like Hobbi useful to you?",
          "ar": "ما الذي قد يجعل تطبيقاً مثل Hobbi مفيداً لك، إن وُجد؟"
        }
      ]
    },
    {
      "id": "explorer-age-check",
      "title": "Staying in touch / البقاء على تواصل",
      "questions": [
        {
          "id": "S05",
          "type": "mc",
          "required": true,
          "en": "Just to double-check: are you 18 or older?",
          "ar": "للتأكد فقط: هل عمرك 18 عاماً أو أكثر؟",
          "help": {
            "en": "We ask again because the form can't remember your first answer.",
            "ar": "نسأل مجدداً لأن النموذج لا يتذكر إجابتك الأولى."
          },
          "options": [
            {
              "en": "Yes, I'm 18 or older",
              "ar": "نعم، عمري 18 عاماً أو أكثر"
            },
            {
              "en": "No, I'm under 18",
              "ar": "لا، عمري أقل من 18 عاماً"
            }
          ],
          "branch": {
            "Yes, I'm 18 or older": "explorer-invite",
            "No, I'm under 18": "explorer-gender"
          }
        }
      ]
    },
    {
      "id": "explorer-invite",
      "title": "Launch invite / دعوة الإطلاق",
      "questions": [
        {
          "id": "E21",
          "type": "mc",
          "required": true,
          "en": "Want an invite to try Hobbi when it launches in your city?",
          "ar": "هل تريد دعوة لتجربة Hobbi عند إطلاقه في مدينتك؟",
          "options": [
            {
              "en": "Yes, invite me",
              "ar": "نعم، أرسلوا لي دعوة"
            },
            {
              "en": "No, thanks",
              "ar": "لا، شكراً"
            }
          ],
          "branch": {
            "Yes, invite me": "explorer-invite-number",
            "No, thanks": "explorer-interview"
          }
        }
      ]
    },
    {
      "id": "explorer-invite-number",
      "title": "Your WhatsApp number / رقم واتساب",
      "questions": [
        {
          "id": "E22",
          "type": "text",
          "required": false,
          "validation": "phone",
          "en": "Leave your WhatsApp number for the invite",
          "ar": "اترك رقم واتساب لنرسل لك الدعوة",
          "help": {
            "en": "Optional. We'll only use it to send the launch invite.",
            "ar": "اختياري. سنستخدمه فقط لإرسال دعوة الإطلاق."
          }
        }
      ]
    },
    {
      "id": "explorer-interview",
      "title": "Follow-up interview / مقابلة متابعة",
      "questions": [
        {
          "id": "E16",
          "type": "mc",
          "required": true,
          "en": "May we contact you for a short follow-up interview?",
          "ar": "هل توافق على أن نتواصل معك لإجراء مقابلة قصيرة؟",
          "options": [
            {
              "en": "Yes, I opt in",
              "ar": "نعم أوافق"
            },
            {
              "en": "No",
              "ar": "لا"
            }
          ],
          "branch": {
            "Yes, I opt in": "explorer-contact",
            "No": "explorer-age-range"
          }
        }
      ]
    },
    {
      "id": "explorer-contact",
      "title": "Contact details / معلومات التواصل",
      "questions": [
        {
          "id": "E17",
          "type": "text",
          "required": false,
          "validation": "phoneOrEmail",
          "en": "Optional contact for the follow-up interview: your WhatsApp number, or email if you prefer",
          "ar": "معلومات تواصل اختيارية لمقابلة المتابعة: رقم واتساب، أو بريد إلكتروني إن كنت تفضّل",
          "help": {
            "en": "If you already left your WhatsApp number above, you can leave this blank.",
            "ar": "إذا تركت رقم واتساب أعلاه، يمكنك ترك هذا الحقل فارغاً."
          }
        }
      ]
    },
    {
      "id": "explorer-age-range",
      "title": "About you (optional) / عنك (اختياري)",
      "questions": [
        {
          "id": "E23",
          "type": "mc",
          "required": false,
          "en": "Your age range",
          "ar": "فئتك العمرية",
          "options": [
            {
              "en": "18–24",
              "ar": "18–24"
            },
            {
              "en": "25–34",
              "ar": "25–34"
            },
            {
              "en": "35–44",
              "ar": "35–44"
            },
            {
              "en": "45+",
              "ar": "45 أو أكثر"
            }
          ]
        }
      ]
    },
    {
      "id": "explorer-gender",
      "title": "About you (optional) / عنك (اختياري)",
      "then": "SUBMIT",
      "questions": [
        {
          "id": "E24",
          "type": "mc",
          "required": false,
          "en": "Your gender",
          "ar": "الجنس",
          "options": [
            {
              "en": "Woman",
              "ar": "امرأة"
            },
            {
              "en": "Man",
              "ar": "رجل"
            },
            {
              "en": "Prefer not to say",
              "ar": "أفضّل عدم الإجابة"
            }
          ]
        }
      ]
    },
    {
      "id": "club-city",
      "title": "Your club / ناديكم",
      "questions": [
        {
          "id": "C01",
          "type": "mc",
          "required": true,
          "en": "Where is your club mainly active?",
          "ar": "أين ينشط ناديكم بشكل أساسي؟",
          "options": [
            {
              "en": "Beirut",
              "ar": "بيروت"
            },
            {
              "en": "Tripoli",
              "ar": "طرابلس"
            },
            {
              "en": "Batroun",
              "ar": "البترون"
            },
            {
              "en": "Jounieh–Keserwan",
              "ar": "جونية–كسروان"
            },
            {
              "en": "Jbeil",
              "ar": "جبيل"
            },
            {
              "en": "South Lebanon",
              "ar": "جنوب لبنان"
            },
            {
              "en": "Bekaa",
              "ar": "البقاع"
            },
            {
              "en": "Several cities",
              "ar": "مدن متعددة"
            },
            {
              "en": "Other",
              "ar": "أخرى"
            }
          ],
          "branch": {
            "Tripoli": "club-tripoli",
            "*": "club-travel"
          }
        }
      ]
    },
    {
      "id": "club-tripoli",
      "title": "Tripoli / طرابلس",
      "then": "club-profile",
      "questions": [
        {
          "id": "C01a",
          "type": "mc",
          "required": true,
          "en": "Which part of Tripoli is your club based in?",
          "ar": "في أي منطقة من طرابلس يقع ناديكم؟",
          "options": [
            {
              "en": "Al Mina",
              "ar": "الميناء"
            },
            {
              "en": "Dam w Farez",
              "ar": "الضم والفرز"
            },
            {
              "en": "Bahsas",
              "ar": "البحصاص"
            },
            {
              "en": "Abu Samra",
              "ar": "أبي سمرا"
            },
            {
              "en": "Old City",
              "ar": "المدينة القديمة"
            },
            {
              "en": "Tal",
              "ar": "التل"
            },
            {
              "en": "Other",
              "ar": "أخرى"
            }
          ]
        }
      ]
    },
    {
      "id": "club-travel",
      "title": "Tripoli / طرابلس",
      "questions": [
        {
          "id": "C01b",
          "type": "mc",
          "required": true,
          "en": "Would you run activities in Tripoli or list them for Tripoli participants?",
          "ar": "هل قد تنظّمون أنشطة في طرابلس، أو تعرضون أنشطتكم للمشاركين من طرابلس؟",
          "options": [
            {
              "en": "We already run activities in Tripoli",
              "ar": "ننظّم أنشطة في طرابلس حالياً"
            },
            {
              "en": "Yes, we'd run activities in Tripoli",
              "ar": "نعم، قد ننظّم أنشطة في طرابلس"
            },
            {
              "en": "We'd only list our activities for people from Tripoli",
              "ar": "قد نعرض أنشطتنا فقط للمشاركين من طرابلس"
            },
            {
              "en": "Not sure",
              "ar": "غير متأكد"
            },
            {
              "en": "No",
              "ar": "لا"
            }
          ]
        }
      ]
    },
    {
      "id": "club-profile",
      "title": "Your activities / أنشطتكم",
      "questions": [
        {
          "id": "C24",
          "type": "mc",
          "required": true,
          "en": "How long has your club been running?",
          "ar": "منذ متى ينشط ناديكم؟",
          "options": [
            {
              "en": "Under 6 months",
              "ar": "أقل من 6 أشهر"
            },
            {
              "en": "6–12 months",
              "ar": "6–12 شهراً"
            },
            {
              "en": "1–3 years",
              "ar": "1–3 سنوات"
            },
            {
              "en": "More than 3 years",
              "ar": "أكثر من 3 سنوات"
            }
          ]
        },
        {
          "id": "C02",
          "type": "checkbox",
          "required": true,
          "en": "What kind of activities do you organize?",
          "ar": "ما نوع الأنشطة التي تنظمونها؟",
          "options": [
            {
              "en": "Sports and fitness",
              "ar": "رياضة ولياقة"
            },
            {
              "en": "Outdoor and hiking",
              "ar": "أنشطة خارجية ومشي جبلي"
            },
            {
              "en": "Arts and crafts",
              "ar": "فنون وأشغال"
            },
            {
              "en": "Music and entertainment",
              "ar": "موسيقى وترفيه"
            },
            {
              "en": "Games and social events",
              "ar": "ألعاب ولقاءات"
            },
            {
              "en": "Workshops and learning",
              "ar": "ورش عمل وتعلم"
            },
            {
              "en": "Wellness",
              "ar": "عافية"
            },
            {
              "en": "Other",
              "ar": "أخرى"
            }
          ]
        },
        {
          "id": "C03",
          "type": "mc",
          "required": true,
          "en": "How many activities do you organize per month?",
          "ar": "كم نشاطاً تنظمون في الشهر؟",
          "options": [
            {
              "en": "0–1",
              "ar": "0–1"
            },
            {
              "en": "2–3",
              "ar": "2–3"
            },
            {
              "en": "4–7",
              "ar": "4–7"
            },
            {
              "en": "8+",
              "ar": "8 أو أكثر"
            },
            {
              "en": "Seasonal",
              "ar": "موسمي"
            }
          ]
        },
        {
          "id": "C25",
          "type": "number",
          "required": false,
          "en": "For your last activity, how many people signed up?",
          "ar": "في آخر نشاط نظّمتموه، كم شخصاً سجّل؟",
          "help": {
            "en": "Your best estimate. Leave blank if you don't take sign-ups.",
            "ar": "يكفي تقدير تقريبي. اتركه فارغاً إذا كنتم لا تستقبلون تسجيلات."
          }
        },
        {
          "id": "C26",
          "type": "number",
          "required": false,
          "en": "…and how many actually came?",
          "ar": "…وكم شخصاً حضر فعلاً؟",
          "help": {
            "en": "Your best estimate.",
            "ar": "يكفي تقدير تقريبي."
          }
        }
      ]
    },
    {
      "id": "club-payments",
      "title": "Payments / الدفع",
      "questions": [
        {
          "id": "C27",
          "type": "mc",
          "required": true,
          "en": "Do participants pay for your activities?",
          "ar": "هل يدفع المشاركون مقابل أنشطتكم؟",
          "options": [
            {
              "en": "Always",
              "ar": "دائماً"
            },
            {
              "en": "Sometimes",
              "ar": "أحياناً"
            },
            {
              "en": "Never",
              "ar": "أبداً"
            }
          ],
          "branch": {
            "Always": "club-prices",
            "Sometimes": "club-prices",
            "Never": "club-operations"
          }
        }
      ]
    },
    {
      "id": "club-prices",
      "title": "Prices and payment / الأسعار وطرق الدفع",
      "questions": [
        {
          "id": "C28",
          "type": "mc",
          "required": true,
          "en": "Typical price per person (USD equivalent)",
          "ar": "السعر المعتاد للشخص الواحد (ما يعادل الدولار)",
          "options": [
            {
              "en": "Below $10",
              "ar": "أقل من 10$"
            },
            {
              "en": "$10–19",
              "ar": "10–19$"
            },
            {
              "en": "$20–39",
              "ar": "20–39$"
            },
            {
              "en": "$40+",
              "ar": "40$ أو أكثر"
            },
            {
              "en": "It varies",
              "ar": "يختلف"
            }
          ]
        },
        {
          "id": "C29",
          "type": "checkbox",
          "required": true,
          "en": "How do participants pay?",
          "ar": "كيف يدفع المشاركون؟",
          "options": [
            {
              "en": "Cash",
              "ar": "نقداً"
            },
            {
              "en": "Whish",
              "ar": "Whish"
            },
            {
              "en": "OMT",
              "ar": "OMT"
            },
            {
              "en": "Bank transfer",
              "ar": "تحويل مصرفي"
            },
            {
              "en": "Card",
              "ar": "بطاقة"
            },
            {
              "en": "Other",
              "ar": "أخرى"
            }
          ]
        }
      ]
    },
    {
      "id": "club-operations",
      "title": "Promotion and bookings / الترويج والحجوزات",
      "questions": [
        {
          "id": "C05",
          "type": "checkbox",
          "required": true,
          "en": "Where do you promote activities today?",
          "ar": "أين تروجون للأنشطة حالياً؟",
          "options": [
            {
              "en": "Instagram",
              "ar": "إنستغرام"
            },
            {
              "en": "WhatsApp",
              "ar": "واتساب"
            },
            {
              "en": "Facebook",
              "ar": "فيسبوك"
            },
            {
              "en": "TikTok",
              "ar": "تيك توك"
            },
            {
              "en": "Website",
              "ar": "موقع إلكتروني"
            },
            {
              "en": "Referrals",
              "ar": "توصيات"
            },
            {
              "en": "Other",
              "ar": "أخرى"
            }
          ]
        },
        {
          "id": "C06",
          "type": "checkbox",
          "required": true,
          "en": "How do you receive and track booking requests?",
          "ar": "كيف تستقبلون وتتابعون طلبات الحجز؟",
          "options": [
            {
              "en": "Instagram messages",
              "ar": "رسائل إنستغرام"
            },
            {
              "en": "WhatsApp",
              "ar": "واتساب"
            },
            {
              "en": "Google Forms or Sheets",
              "ar": "نماذج أو جداول غوغل"
            },
            {
              "en": "Website or booking software",
              "ar": "موقع أو نظام حجوزات"
            },
            {
              "en": "Phone calls",
              "ar": "مكالمات"
            },
            {
              "en": "Manual lists",
              "ar": "قوائم يدوية"
            },
            {
              "en": "Other",
              "ar": "أخرى"
            }
          ]
        },
        {
          "id": "C07",
          "type": "checkbox",
          "required": true,
          "maxSelections": 3,
          "en": "What are your top operational challenges? (Up to 3)",
          "ar": "ما أبرز تحديات الإدارة لديكم؟ (حتى 3)",
          "options": [
            {
              "en": "Attracting participants",
              "ar": "جذب المشاركين"
            },
            {
              "en": "Tracking booking requests",
              "ar": "متابعة الحجوزات"
            },
            {
              "en": "Cancellations and no-shows",
              "ar": "الإلغاء والغياب"
            },
            {
              "en": "Communicating updates",
              "ar": "إيصال التحديثات"
            },
            {
              "en": "Managing members",
              "ar": "إدارة الأعضاء"
            },
            {
              "en": "Scheduling activities",
              "ar": "جدولة الأنشطة"
            },
            {
              "en": "Managing staff",
              "ar": "إدارة الفريق"
            },
            {
              "en": "Understanding results",
              "ar": "فهم النتائج"
            },
            {
              "en": "None",
              "ar": "لا توجد"
            }
          ]
        },
        {
          "id": "C08",
          "type": "mc",
          "required": true,
          "en": "Do you approve participants before confirming activity bookings?",
          "ar": "هل توافقون على المشاركين قبل تأكيد الحجز؟",
          "options": [
            {
              "en": "Always",
              "ar": "دائماً"
            },
            {
              "en": "Sometimes",
              "ar": "أحياناً"
            },
            {
              "en": "Never",
              "ar": "أبداً"
            },
            {
              "en": "Depends",
              "ar": "حسب النشاط"
            }
          ]
        },
        {
          "id": "C09",
          "type": "mc",
          "required": true,
          "en": "Roughly how much time do you or your team spend on bookings and coordination each week?",
          "ar": "كم من الوقت تقضون أنتم أو فريقكم أسبوعياً في الحجوزات والتنسيق تقريباً؟",
          "options": [
            {
              "en": "Under 2 hours",
              "ar": "أقل من ساعتين"
            },
            {
              "en": "2–5 hours",
              "ar": "2–5 ساعات"
            },
            {
              "en": "6–10 hours",
              "ar": "6–10 ساعات"
            },
            {
              "en": "10+ hours",
              "ar": "أكثر من 10 ساعات"
            },
            {
              "en": "Unsure",
              "ar": "غير متأكد"
            }
          ]
        }
      ]
    },
    {
      "id": "club-tools",
      "title": "Tools / الأدوات",
      "questions": [
        {
          "id": "C11",
          "type": "checkbox",
          "required": true,
          "maxSelections": 3,
          "en": "Which platform features would help your club most? (Up to 3)",
          "ar": "ما الميزات الأكثر مساعدة لناديكم؟ (حتى 3)",
          "options": [
            {
              "en": "Public club profile",
              "ar": "صفحة عامة للنادي"
            },
            {
              "en": "Activity listings",
              "ar": "نشر الأنشطة"
            },
            {
              "en": "Booking approvals",
              "ar": "الموافقة على الحجوزات"
            },
            {
              "en": "Member management",
              "ar": "إدارة الأعضاء"
            },
            {
              "en": "Messaging and updates",
              "ar": "المراسلة والتحديثات"
            },
            {
              "en": "Automated reminders",
              "ar": "تذكيرات تلقائية"
            },
            {
              "en": "Waitlists",
              "ar": "قوائم انتظار"
            },
            {
              "en": "Analytics",
              "ar": "تحليلات"
            },
            {
              "en": "Staff accounts",
              "ar": "حسابات الموظفين"
            },
            {
              "en": "None of these",
              "ar": "لا شيء مما سبق"
            }
          ]
        },
        {
          "id": "C12",
          "type": "mc",
          "required": true,
          "en": "What would most prevent you from adopting a new platform?",
          "ar": "ما أكثر شيء قد يمنعكم من اعتماد منصة جديدة؟",
          "options": [
            {
              "en": "Setup takes too much time",
              "ar": "الإعداد يستغرق وقتاً"
            },
            {
              "en": "Members would not use it",
              "ar": "لن يستخدمها الأعضاء"
            },
            {
              "en": "Price",
              "ar": "السعر"
            },
            {
              "en": "Privacy or data concerns",
              "ar": "مخاوف الخصوصية"
            },
            {
              "en": "Missing integrations",
              "ar": "نقص التكامل"
            },
            {
              "en": "Current tools are sufficient",
              "ar": "الأدوات الحالية كافية"
            },
            {
              "en": "Other",
              "ar": "أخرى"
            }
          ]
        },
        {
          "id": "C15",
          "type": "mc",
          "required": true,
          "en": "What do you currently pay monthly for club-management software? (USD equivalent)",
          "ar": "كم تدفعون شهرياً حالياً لبرامج إدارة النادي؟ (بالدولار أو ما يعادله)",
          "options": [
            {
              "en": "$0, we don't pay",
              "ar": "صفر، لا ندفع"
            },
            {
              "en": "Below $10",
              "ar": "أقل من 10$"
            },
            {
              "en": "$10–29",
              "ar": "10–29$"
            },
            {
              "en": "$30–59",
              "ar": "30–59$"
            },
            {
              "en": "$60+",
              "ar": "60$ أو أكثر"
            },
            {
              "en": "Unsure / prefer not to say",
              "ar": "غير متأكد / أفضل عدم الإجابة"
            }
          ]
        }
      ]
    },
    {
      "id": "club-pricing",
      "title": "Pricing and decisions / الأسعار والقرارات",
      "questions": [
        {
          "id": "C16",
          "type": "mc",
          "required": true,
          "en": "What monthly price would you consider fair for tools that save your club time?",
          "ar": "ما السعر الشهري الذي تعتبرونه عادلاً لأدوات توفّر الوقت على ناديكم؟",
          "options": [
            {
              "en": "Free only",
              "ar": "مجاني فقط"
            },
            {
              "en": "$9",
              "ar": "9$"
            },
            {
              "en": "$15",
              "ar": "15$"
            },
            {
              "en": "$19",
              "ar": "19$"
            },
            {
              "en": "More than $19",
              "ar": "أكثر من 19$"
            },
            {
              "en": "Not sure",
              "ar": "غير متأكد"
            }
          ]
        },
        {
          "id": "C17",
          "type": "checkbox",
          "required": true,
          "maxSelections": 3,
          "en": "Which Pro features, if any, are worth paying for? (Up to 3)",
          "ar": "أي مزايا Pro قد تستحق الدفع؟ (حتى 3)",
          "options": [
            {
              "en": "Advanced analytics",
              "ar": "تحليلات متقدمة"
            },
            {
              "en": "Automatic reminders",
              "ar": "تذكيرات تلقائية"
            },
            {
              "en": "Waitlist management",
              "ar": "إدارة الانتظار"
            },
            {
              "en": "Recurring schedules",
              "ar": "جداول متكررة"
            },
            {
              "en": "More staff accounts",
              "ar": "حسابات إضافية"
            },
            {
              "en": "Participant export",
              "ar": "تصدير المشاركين"
            },
            {
              "en": "Priority support",
              "ar": "دعم أولوية"
            },
            {
              "en": "None",
              "ar": "لا شيء"
            }
          ]
        }
      ]
    },
    {
      "id": "club-final",
      "title": "Final thoughts / أفكار أخيرة",
      "questions": [
        {
          "id": "C20",
          "type": "paragraph",
          "required": false,
          "en": "What, if anything, would Hobbi need to do better than your current tools to earn your trust?",
          "ar": "ما الذي يجب أن يقدمه Hobbi بشكل أفضل من أدواتكم الحالية ليكسب ثقتكم، إن وُجد؟"
        },
        {
          "id": "C21",
          "type": "text",
          "required": false,
          "en": "Optional public club name or Instagram handle",
          "ar": "اسم النادي أو حساب إنستغرام العام (اختياري)"
        }
      ]
    },
    {
      "id": "club-pilot",
      "title": "Pilot / التجربة",
      "questions": [
        {
          "id": "C13",
          "type": "mc",
          "required": true,
          "en": "Would you like to join the free 8-week pilot? We will contact you on WhatsApp.",
          "ar": "هل ترغبون في المشاركة في التجربة المجانية لمدة 8 أسابيع؟ سنتواصل معكم عبر واتساب.",
          "help": {
            "en": "The pilot runs in Tripoli.",
            "ar": "تجري التجربة في طرابلس."
          },
          "options": [
            {
              "en": "Yes",
              "ar": "نعم"
            },
            {
              "en": "Maybe, tell me more",
              "ar": "ربما، أخبرونا المزيد"
            },
            {
              "en": "No",
              "ar": "لا"
            }
          ],
          "branch": {
            "Yes": "club-pilot-number",
            "Maybe, tell me more": "club-pilot-number",
            "No": "club-interview"
          }
        }
      ]
    },
    {
      "id": "club-pilot-number",
      "title": "Your WhatsApp number / رقم واتساب",
      "questions": [
        {
          "id": "C30",
          "type": "text",
          "required": false,
          "validation": "phone",
          "en": "Your WhatsApp number for the pilot",
          "ar": "رقم واتساب للتواصل بخصوص التجربة",
          "help": {
            "en": "Optional. We'll only use it to contact you about the pilot.",
            "ar": "اختياري. سنستخدمه فقط للتواصل معكم بخصوص التجربة."
          }
        }
      ]
    },
    {
      "id": "club-interview",
      "title": "Research interview / مقابلة بحثية",
      "questions": [
        {
          "id": "C22",
          "type": "mc",
          "required": true,
          "en": "May we contact you for a short research interview?",
          "ar": "هل توافقون على أن نتواصل معكم لإجراء مقابلة بحثية قصيرة؟",
          "options": [
            {
              "en": "Yes, I opt in",
              "ar": "نعم أوافق"
            },
            {
              "en": "No",
              "ar": "لا"
            }
          ],
          "branch": {
            "Yes, I opt in": "club-contact",
            "No": "SUBMIT"
          }
        }
      ]
    },
    {
      "id": "club-contact",
      "title": "Contact details / معلومات التواصل",
      "then": "SUBMIT",
      "questions": [
        {
          "id": "C23",
          "type": "text",
          "required": false,
          "validation": "phoneOrEmail",
          "en": "Optional contact for the research interview: your WhatsApp number, or email if you prefer",
          "ar": "معلومات تواصل اختيارية للمقابلة البحثية: رقم واتساب، أو بريد إلكتروني إن كنتم تفضّلون",
          "help": {
            "en": "If you already left your WhatsApp number for the pilot, you can leave this blank.",
            "ar": "إذا تركتم رقم واتساب للتجربة، يمكنكم ترك هذا الحقل فارغاً."
          }
        }
      ]
    },
    {
      "id": "exit",
      "title": "Thanks for stopping by / شكراً لزيارتك",
      "description": "Taking part is your choice. Press Submit to close the survey. We record only that you didn't continue.\n\nالمشاركة خيارك. اضغط «إرسال» لإغلاق الاستطلاع. لن نسجّل إلا أنك لم تتابع.",
      "questions": []
    }
  ]
};

function buildHobbiSurvey() {
  const form = FormApp.create(SURVEY.title)
    .setDescription(SURVEY.description)
    .setCollectEmail(false) // No automatic email collection.
    .setLimitOneResponsePerUser(false) // That setting would force a Google sign-in.
    .setAllowResponseEdits(false)
    .setPublishingSummary(false) // Respondents must never see other people's answers.
    .setProgressBar(false) // Respondents shouldn't see how much is left, so they aren't put off.
    .setShowLinkToRespondAgain(true) // Lets someone who is both explorer and club answer twice.
    .setConfirmationMessage(SURVEY.confirmation);

  const pageBreaks = {};
  const branching = [];

  // Pass 1: create every section and question in order. The first page has no page break.
  SURVEY.pages.forEach((page, index) => {
    if (index > 0) {
      pageBreaks[page.id] = form
        .addPageBreakItem()
        .setTitle(page.title)
        .setHelpText(page.description || '');
    }
    page.questions.forEach((question) => {
      const item = addQuestion_(form, question);
      if (question.branch) branching.push({ item: item, question: question });
    });
  });

  const destination = (pageId) =>
    pageId === 'SUBMIT' ? FormApp.PageNavigationType.SUBMIT : pageBreaks[pageId];

  // Pass 2: fixed jumps. A page break's "go to" controls where the page *before* it
  // leads, so each page's jump is set on the page break that follows it.
  SURVEY.pages.forEach((page, index) => {
    const next = SURVEY.pages[index + 1];
    if (page.then && next) pageBreaks[next.id].setGoToPage(destination(page.then));
  });

  // Pass 3: routing by answer, now that every target section exists.
  branching.forEach(({ item, question }) => {
    item.setChoices(
      question.options.map((option) =>
        item.createChoice(
          label_(option),
          destination(question.branch[option.en] || question.branch['*']),
        ),
      ),
    );
  });

  Logger.log('Edit the form: ' + form.getEditUrl());
  Logger.log('Share with respondents: ' + form.getPublishedUrl());
  return form;
}

function addQuestion_(form, question) {
  const options = (question.options || []).map(label_);
  let item;

  switch (question.type) {
    case 'mc':
      item = form.addMultipleChoiceItem().setChoiceValues(options);
      break;
    case 'checkbox':
      item = form.addCheckboxItem().setChoiceValues(options);
      if (question.maxSelections) {
        item.setValidation(
          FormApp.createCheckboxValidation()
            .setHelpText(
              'Select up to ' + question.maxSelections + ' / اختر حتى ' + question.maxSelections,
            )
            .requireSelectAtMost(question.maxSelections)
            .build(),
        );
      }
      break;
    case 'paragraph':
      item = form
        .addParagraphTextItem()
        .setValidation(
          FormApp.createParagraphTextValidation()
            .setHelpText('Keep it under 1,000 characters / يجب ألا يتجاوز النص 1000 حرف')
            .requireTextLengthLessThanOrEqualTo(1000)
            .build(),
        );
      break;
    case 'number':
      item = form
        .addTextItem()
        .setValidation(
          FormApp.createTextValidation()
            .setHelpText('Enter a whole number using digits 0–9 / أدخل رقماً صحيحاً بالأرقام 0–9')
            .requireWholeNumber()
            .build(),
        );
      break;
    case 'text':
      item = form.addTextItem().setValidation(textValidation_(question.validation));
      break;
    default:
      throw new Error('Unknown question type for ' + question.id + ': ' + question.type);
  }

  // Google Forms titles are one line, so the Arabic goes in the line below the title.
  const help = [question.ar];
  if (question.help) help.push(question.help.en, question.help.ar);

  return item.setTitle(question.en).setHelpText(help.join('\n')).setRequired(question.required);
}

function textValidation_(kind) {
  const builder = FormApp.createTextValidation();
  if (kind === 'phone') {
    return builder
      .setHelpText('Enter a phone number, e.g. +961 3 123 456 / أدخل رقم هاتف، مثل ‎+961 3 123 456')
      .requireTextMatchesPattern(PHONE_PATTERN)
      .build();
  }
  if (kind === 'phoneOrEmail') {
    return builder
      .setHelpText('Enter a WhatsApp number or an email address / أدخل رقم واتساب أو بريداً إلكترونياً')
      .requireTextMatchesPattern(PHONE_OR_EMAIL_PATTERN)
      .build();
  }
  return builder
    .setHelpText('Keep it under 120 characters / يجب ألا يتجاوز النص 120 حرفاً')
    .requireTextLengthLessThanOrEqualTo(120)
    .build();
}

function label_(option) {
  return option.en === option.ar ? option.en : option.en + ' / ' + option.ar;
}
