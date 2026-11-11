// Interface copy. Question wording lives in the CSV; this file holds everything
// around it. The Arabic here was not in the research documents, so it should get
// a native review before launch.
import type { Locale } from "@/survey/types";

export type Messages = {
  meta: { title: string; description: string };
  common: {
    next: string;
    previous: string;
    switchLanguage: string;
  };
  welcome: {
    title: string;
    intro: string;
    facts: { label: string; text: string }[];
    privacyTitle: string;
    privacy: string[];
    start: string;
  };
  draft: { restored: string; startOver: string };
  screening: {
    title: string;
    intro: string;
    adultQuestion: string;
    adultYes: string;
    adultNo: string;
    consentQuestion: string;
    consentYes: string;
    consentNo: string;
  };
  exit: {
    declinedTitle: string;
    declinedBody: string;
    back: string;
  };
  audience: {
    title: string;
    hint: string;
    explorerTitle: string;
    explorerBody: string;
    clubTitle: string;
    clubBody: string;
  };
  question: {
    optional: string;
    selectedCount: (selected: number, max: number) => string;
    limitReached: (max: number) => string;
    characters: (used: number, max: number) => string;
    clubIdentityHint: string;
    stepErrors: (count: number) => string;
    scaleHint: (min: number, max: number) => string;
  };
  errors: {
    required: string;
    too_many: (max: number) => string;
    too_long: (max: number) => string;
    contact_invalid: string;
    not_number: string;
    fallback: string;
  };
  review: {
    title: string;
    intro: string;
    edit: (section: string) => string;
    backToReview: string;
    notAnswered: string;
    submit: string;
    invalid: string;
  };
  submit: {
    network: string;
    rateLimited: string;
    server: string;
    invalid: string;
    retry: string;
    sending: string;
  };
  thanks: {
    title: string;
    body: string;
    contactOptIn: string;
    otherSurveyExplorer: string;
    otherSurveyClub: string;
    takeOtherSurvey: string;
  };
};

const en: Messages = {
  meta: {
    title: "Hobbi: Clubs & Explorers Research",
    description:
      "A short research survey about how people in Lebanon find, join and organize activities.",
  },
  common: {
    next: "Next",
    previous: "Previous",
    switchLanguage: "العربية",
  },
  welcome: {
    title: "Help shape how Lebanon finds its next hobby.",
    intro:
      "Hobbi is a new app for discovering activities and the clubs behind them. Tell us how you find, join or organize activities today, and what gets in the way.",
    facts: [
      { label: "Explorers", text: "6–8 minutes" },
      { label: "Club organizers", text: "8–10 minutes" },
    ],
    privacyTitle: "Your privacy",
    privacy: [
      "No account or login. We don't collect your email automatically.",
      "We only ask for contact details if you choose to hear from us, and you can skip them.",
      "We share aggregated results, never individual contact details.",
      "This is research. It isn't a signup or a commitment to pay.",
    ],
    start: "Start the survey",
  },
  draft: {
    restored: "Your earlier answers are still here.",
    startOver: "Start over",
  },
  screening: {
    title: "Before you begin",
    intro: "Taking part is voluntary.",
    adultQuestion: "Are you 18 or older?",
    adultYes: "Yes, I'm 18 or older",
    adultNo: "No, I'm under 18",
    consentQuestion: "Do you agree to take part in this research?",
    consentYes: "Yes, I agree",
    consentNo: "No, I don't want to take part",
  },
  exit: {
    declinedTitle: "No problem",
    declinedBody:
      "Taking part is entirely your choice. Nothing you entered was saved. Thanks for stopping by.",
    back: "Change my answer",
  },
  audience: {
    title: "Which describes you?",
    hint: "If you're both, choose one now. You can take the other survey when you finish.",
    explorerTitle: "Explorer",
    explorerBody: "I attend activities or want to try new hobbies.",
    clubTitle: "Club organizer",
    clubBody: "I run or help run a club that offers activities.",
  },
  question: {
    optional: "Optional",
    selectedCount: (selected, max) => `${selected} of ${max} selected`,
    limitReached: (max) =>
      `You can select up to ${max}. Unselect one to choose another.`,
    characters: (used, max) => `${used} of ${max} characters`,
    clubIdentityHint: "Public details only. Leave blank to stay anonymous.",
    stepErrors: (count) =>
      count === 1
        ? "1 question on this page needs your attention."
        : `${count} questions on this page need your attention.`,
    scaleHint: (min, max) => `From ${min} to ${max}`,
  },
  errors: {
    required: "Choose an answer to continue.",
    too_many: (max) => `Select no more than ${max}.`,
    too_long: (max) => `Keep this under ${max} characters.`,
    contact_invalid:
      "This doesn't look like a valid WhatsApp number or email. Check it, or leave it blank.",
    not_number: "Enter a whole number, such as 12, or leave it blank.",
    fallback: "Check this answer.",
  },
  review: {
    title: "Review your answers",
    intro: "Change anything you like, then submit.",
    edit: (section) => `Edit ${section}`,
    backToReview: "Back to review",
    notAnswered: "Not answered",
    submit: "Submit answers",
    invalid: "Some answers need your attention. We've taken you to the first one.",
  },
  submit: {
    network:
      "Your answers weren't sent because the connection failed. They're still here, so check your connection and try again.",
    rateLimited:
      "Too many responses have come from this network recently. Your answers are still here, so try again in a little while.",
    server:
      "Your answers weren't saved because of a problem on our side. They're still here, so try again.",
    invalid:
      "Some answers couldn't be accepted. Review them and try again.",
    retry: "Try again",
    sending: "Sending your answers…",
  },
  thanks: {
    title: "Thank you. Your answers are in.",
    body: "What you shared will shape what Hobbi builds first.",
    contactOptIn:
      "You left contact details, so we may reach out about what you agreed to: the launch invite, the pilot or an interview. We won't use your details for anything else.",
    otherSurveyExplorer: "Do you also run a club?",
    otherSurveyClub: "Do you also attend activities as an explorer?",
    takeOtherSurvey: "Take the other survey",
  },
};

const ar: Messages = {
  meta: {
    title: "Hobbi: استطلاع الأندية والمشاركين",
    description:
      "استطلاع بحثي قصير حول كيفية إيجاد الأنشطة والانضمام إليها وتنظيمها في لبنان.",
  },
  common: {
    next: "التالي",
    previous: "السابق",
    switchLanguage: "English",
  },
  welcome: {
    title: "ساعدنا في رسم الطريق إلى هوايتك القادمة في لبنان.",
    intro:
      "Hobbi تطبيق جديد لاكتشاف الأنشطة والأندية التي تنظمها. أخبرنا كيف تجد الأنشطة اليوم أو تشارك فيها أو تنظمها، وما الذي يعيقك.",
    facts: [
      { label: "المشاركون", text: "6–8 دقائق" },
      { label: "منظمو الأندية", text: "8–10 دقائق" },
    ],
    privacyTitle: "خصوصيتك",
    privacy: [
      "لا حاجة إلى حساب أو تسجيل دخول، ولا نجمع بريدك الإلكتروني تلقائياً.",
      "لا نطلب معلومات التواصل إلا إذا اخترت أن نتواصل معك، ويمكنك تخطيها.",
      "نشارك النتائج الإجمالية فقط، ولا نشارك معلومات التواصل الفردية أبداً.",
      "هذا بحث، وليس تسجيلاً في خدمة أو التزاماً بالدفع.",
    ],
    start: "ابدأ الاستطلاع",
  },
  draft: {
    restored: "إجاباتك السابقة ما زالت هنا.",
    startOver: "البدء من جديد",
  },
  screening: {
    title: "قبل أن تبدأ",
    intro: "المشاركة طوعية.",
    adultQuestion: "هل عمرك 18 عاماً أو أكثر؟",
    adultYes: "نعم، عمري 18 عاماً أو أكثر",
    adultNo: "لا، عمري أقل من 18 عاماً",
    consentQuestion: "هل توافق على المشاركة في هذا البحث؟",
    consentYes: "نعم، أوافق",
    consentNo: "لا، لا أرغب في المشاركة",
  },
  exit: {
    declinedTitle: "لا بأس",
    declinedBody:
      "المشاركة خيارك بالكامل. لم نحفظ أي شيء أدخلته. شكراً لزيارتك.",
    back: "تغيير إجابتي",
  },
  audience: {
    title: "أي وصف ينطبق عليك؟",
    hint: "إذا كان كلاهما ينطبق عليك، فاختر واحداً الآن. يمكنك إكمال الاستطلاع الآخر عند الانتهاء.",
    explorerTitle: "مشارك",
    explorerBody: "أحضر الأنشطة أو أرغب في تجربة هوايات جديدة.",
    clubTitle: "منظم نادٍ",
    clubBody: "أدير نادياً يقدم أنشطة أو أساعد في إدارته.",
  },
  question: {
    optional: "اختياري",
    selectedCount: (selected, max) => `تم اختيار ${selected} من ${max}`,
    limitReached: (max) =>
      `يمكنك اختيار ${max} كحد أقصى. ألغِ أحد الخيارات لاختيار خيار آخر.`,
    characters: (used, max) => `${used} من ${max} حرفاً`,
    clubIdentityHint: "معلومات عامة فقط. اتركها فارغة إذا أردت عدم الكشف عن هويتك.",
    stepErrors: (count) =>
      count === 1
        ? "هناك سؤال واحد في هذه الصفحة يحتاج إلى انتباهك."
        : `عدد الأسئلة التي تحتاج إلى انتباهك في هذه الصفحة: ${count}.`,
    scaleHint: (min, max) => `من ${min} إلى ${max}`,
  },
  errors: {
    required: "اختر إجابة للمتابعة.",
    too_many: (max) => `اختر ${max} كحد أقصى.`,
    too_long: (max) => `يجب ألا يتجاوز النص ${max} حرفاً.`,
    contact_invalid:
      "لا يبدو هذا رقم واتساب أو بريداً إلكترونياً صحيحاً. تحقق منه أو اتركه فارغاً.",
    not_number: "أدخل رقماً صحيحاً، مثل 12، أو اتركه فارغاً.",
    fallback: "تحقق من هذه الإجابة.",
  },
  review: {
    title: "راجع إجاباتك",
    intro: "عدّل ما تريد، ثم أرسل إجاباتك.",
    edit: (section) => `تعديل ${section}`,
    backToReview: "العودة إلى المراجعة",
    notAnswered: "لم تتم الإجابة",
    submit: "إرسال الإجابات",
    invalid: "بعض الإجابات تحتاج إلى انتباهك. انتقلنا بك إلى أولها.",
  },
  submit: {
    network:
      "لم تُرسل إجاباتك بسبب تعذر الاتصال. ما زالت إجاباتك هنا، لذا تحقق من اتصالك وحاول مرة أخرى.",
    rateLimited:
      "وصل عدد كبير من الردود من هذه الشبكة مؤخراً. ما زالت إجاباتك هنا، فحاول مرة أخرى بعد قليل.",
    server:
      "لم تُحفظ إجاباتك بسبب مشكلة من جهتنا. ما زالت إجاباتك هنا، فحاول مرة أخرى.",
    invalid: "تعذر قبول بعض الإجابات. راجعها وحاول مرة أخرى.",
    retry: "حاول مرة أخرى",
    sending: "جارٍ إرسال إجاباتك…",
  },
  thanks: {
    title: "شكراً لك. وصلتنا إجاباتك.",
    body: "ما شاركته معنا سيحدد ما يبنيه Hobbi أولاً.",
    contactOptIn:
      "لقد تركت معلومات تواصل، لذا قد نتواصل معك بخصوص ما وافقت عليه: دعوة الإطلاق أو التجربة أو مقابلة. لن نستخدم معلوماتك لأي غرض آخر.",
    otherSurveyExplorer: "هل تدير نادياً أيضاً؟",
    otherSurveyClub: "هل تحضر الأنشطة كمشارك أيضاً؟",
    takeOtherSurvey: "أكمل الاستطلاع الآخر",
  },
};

export const messages: Record<Locale, Messages> = { en, ar };
