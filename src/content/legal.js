// Privacy policy and terms: DRAFTS for the owner and a lawyer to review.
// Every statement about data describes what the code does today; anything
// only the owner can supply is a visible [OWNER: …] placeholder. The pages
// are published with noindex until `draft` is set to false.

export const LEGAL = {
  privacy: {
    draft: true,
    updated: "2026-09-27",
    en: {
      title: "Privacy",
      summary: "What The Scent Handbook stores about you, why, who processes it, and how to get it or delete it.",
      sections: [
        { id: "who", h: "Who we are", p: [
          "The Scent Handbook is run by [OWNER: legal name or trading name, country]. Contact: [OWNER: privacy email address].",
        ] },
        { id: "what", h: "What we store", p: [
          "Your account: your email address, and the sign-in provider you used (email link or Google).",
          "What you save in the app: batches (fragrance name, weights, strength, dates, notes, cost fields you fill in), inventory, notes on fragrances, calculator presets, and your preferences (language, units, usual bottle size, digit style).",
          "Your plan (Free or Pro) and, if you join it, your place on the Pro waitlist.",
          "Fragrances you add to the shared catalog are stored with a link to your account until an admin approves them. If you delete your account the fragrance stays in the catalog without that link.",
        ] },
        { id: "not", h: "What we do not do", p: [
          "We do not sell your data, show advertising, or use tracking cookies.",
          "The public pages (the home page, pricing and guides) do not load the sign-in system at all.",
        ] },
        { id: "device", h: "Stored on your device", p: [
          "Your browser keeps your sign-in session, your language and digit choices, and batches you logged while offline until they are sent. These stay on your device and are cleared when you sign out or clear site data.",
        ] },
        { id: "ai", h: "Ask (AI)", p: [
          "Ask is a Pro feature that sends your question, the conversation so far, and your 30 most recent batches (date, fragrance name, family, strength, size, oil weight, oil type, price and cost fields, and notes) to Google's Gemini API to write an answer. Your email address is not sent.",
          "Google processes this under its Gemini API terms. [OWNER: confirm the API tier in use. On Gemini's free tier Google may use prompts to improve its products; on the paid tier it does not.]",
          "Answers are written by an AI model. They can be wrong. Check anything that matters against the guides.",
        ] },
        { id: "processors", h: "Who processes your data", p: [
          "Supabase (database and sign-in), hosted in the EU (Ireland).",
          "Vercel (hosting and the server functions), which run in the EU (Dublin). Vercel Web Analytics counts page views without cookies and without storing personal data.",
          "Google (Gemini) only when you use Ask, as described above. Google, if you choose it to sign in.",
        ] },
        { id: "rights", h: "Your data, your choice", p: [
          "Account → Your data downloads everything you have saved, as JSON or CSV.",
          "Account → Delete account removes your account and everything in it straight away. It cannot be undone.",
          "For anything else — a correction, a question, a complaint — write to [OWNER: privacy email address]. [OWNER: add the supervisory authority for your country if you serve users in the EU/UK.]",
        ] },
        { id: "keep", h: "How long we keep it", p: [
          "Until you delete it or delete your account. Database backups kept by Supabase roll over within [OWNER: confirm the backup retention of the Supabase plan].",
        ] },
      ],
    },
    ar: {
      title: "الخصوصية",
      summary: "ما الذي يحفظه The Scent Handbook عنك، ولماذا، ومن يعالجه، وكيف تحصل عليه أو تحذفه.",
      sections: [
        { id: "who", h: "من نحن", p: [
          "يدير The Scent Handbook ‏[OWNER: الاسم القانوني أو التجاري، والبلد]. للتواصل: [OWNER: بريد الخصوصية].",
        ] },
        { id: "what", h: "ما الذي نحفظه", p: [
          "حسابك: بريدك الإلكتروني، وطريقة تسجيل الدخول التي استخدمتها (رابط البريد أو Google).",
          "ما تحفظه في التطبيق: الخلطات (اسم العطر والأوزان والتركيز والتواريخ والملاحظات وحقول التكلفة التي تملؤها)، والمخزون، وملاحظاتك على العطور، والإعدادات المحفوظة في الحاسبة، وتفضيلاتك (اللغة والوحدات وحجم الزجاجة المعتاد وشكل الأرقام).",
          "خطتك (المجانية أو Pro)، ومكانك في قائمة انتظار Pro إن انضممت إليها.",
          "العطور التي تضيفها إلى الفهرس المشترك تُحفظ مرتبطة بحسابك حتى يوافق عليها مشرف. إن حذفت حسابك يبقى العطر في الفهرس دون هذا الارتباط.",
        ] },
        { id: "not", h: "ما لا نفعله", p: [
          "لا نبيع بياناتك، ولا نعرض إعلانات، ولا نستخدم ملفات تعريف ارتباط للتتبّع.",
          "الصفحات العامة (الرئيسية والخطط والأدلة) لا تحمّل نظام تسجيل الدخول أصلًا.",
        ] },
        { id: "device", h: "ما يُحفظ على جهازك", p: [
          "يحتفظ متصفحك بجلسة تسجيل الدخول، واختيارك للغة وشكل الأرقام، والخلطات التي سجّلتها دون اتصال حتى تُرسَل. تبقى هذه على جهازك وتُمسح عند تسجيل الخروج أو مسح بيانات الموقع.",
        ] },
        { id: "ai", h: "اسأل (الذكاء الاصطناعي)", p: [
          "ميزة «اسأل» جزء من Pro، وهي ترسل سؤالك والمحادثة حتى الآن وآخر 30 خلطة لك (التاريخ واسم العطر والعائلة والتركيز والحجم ووزن الزيت ونوعه وحقول السعر والتكلفة والملاحظات) إلى واجهة Gemini من Google لكتابة الإجابة. لا يُرسَل بريدك الإلكتروني.",
          "تعالج Google هذه البيانات وفق شروط واجهة Gemini. [OWNER: أكّد فئة الواجهة المستخدمة. في الفئة المجانية قد تستخدم Google الطلبات لتحسين منتجاتها، وفي الفئة المدفوعة لا تفعل.]",
          "الإجابات يكتبها نموذج ذكاء اصطناعي وقد تكون خاطئة. راجع كل ما يهمّك في الأدلة.",
        ] },
        { id: "processors", h: "من يعالج بياناتك", p: [
          "Supabase (قاعدة البيانات وتسجيل الدخول)، مستضافة في الاتحاد الأوروبي (أيرلندا).",
          "Vercel (الاستضافة ووظائف الخادم)، وتعمل في الاتحاد الأوروبي (دبلن). تحصي تحليلات Vercel زيارات الصفحات دون ملفات تعريف ارتباط ودون حفظ بيانات شخصية.",
          "Google ‏(Gemini) عند استخدامك «اسأل» فقط كما وُصف أعلاه. وGoogle إن اخترته لتسجيل الدخول.",
        ] },
        { id: "rights", h: "بياناتك، واختيارك", p: [
          "الحساب ← بياناتك: نزّل كل ما حفظته بصيغة JSON أو CSV.",
          "الحساب ← حذف الحساب: يحذف حسابك وكل ما فيه فورًا، ولا يمكن التراجع عن ذلك.",
          "لأي أمر آخر — تصحيح أو سؤال أو شكوى — راسل [OWNER: بريد الخصوصية]. [OWNER: أضف جهة الرقابة المختصة في بلدك إن كنت تخدم مستخدمين في الاتحاد الأوروبي أو المملكة المتحدة.]",
        ] },
        { id: "keep", h: "مدة الاحتفاظ", p: [
          "حتى تحذفها أو تحذف حسابك. تتجدد النسخ الاحتياطية لدى Supabase خلال [OWNER: أكّد مدة الاحتفاظ بالنسخ الاحتياطية في خطة Supabase].",
        ] },
      ],
    },
  },
  terms: {
    draft: true,
    updated: "2026-09-27",
    en: {
      title: "Terms",
      summary: "The terms for using The Scent Handbook: the calculator, the guides and the app.",
      sections: [
        { id: "service", h: "The service", p: [
          "The Scent Handbook is a calculator, a bench guide and a record-keeping app for people who dilute fragrance oil with perfumer's alcohol at home. It is run by [OWNER: legal name, country].",
          "The Free plan is free. Pro is in early access and not on sale; if it goes on sale, prices and payment terms will be shown before you pay anything.",
        ] },
        { id: "safety", h: "Safety is yours", p: [
          "Perfumer's alcohol is flammable, and fragrance oils can irritate skin and eyes or cause allergic reactions. Work away from flame and heat, in a ventilated room, and keep materials away from children and pets. Read the safety data sheet for every material you use.",
          "The numbers the app gives are starting points calculated from reference densities, not guarantees. Check your weights on your own scale. You are responsible for what you make, how you use it, and whether it is safe for you and anyone you give it to.",
          "Nothing here is medical, legal or regulatory advice. Selling what you make may need safety assessments and labelling under the rules where you live.",
        ] },
        { id: "account", h: "Your account", p: [
          "Keep your sign-in secure. One person per account.",
          "Don't use the app to break the law, to attack or overload it, or to scrape the catalog.",
          "We may suspend an account that does, after telling you why where we can.",
        ] },
        { id: "content", h: "Content", p: [
          "The guides and the handbook text are © Hisham Shiboob. You may read, print and share links to them; please don't republish them.",
          "What you save is yours. You can download it or delete it at any time from your account.",
          "Fragrances you add to the shared catalog may be shown to other users once approved.",
        ] },
        { id: "ai", h: "Ask (AI)", p: [
          "Ask's answers are written by an AI model and can be wrong. Treat them as suggestions and check anything that matters against the guides.",
        ] },
        { id: "liability", h: "Liability", p: [
          "[OWNER: a limitation-of-liability clause and governing law, drafted for your country by a lawyer.]",
        ] },
        { id: "changes", h: "Changes", p: [
          "If these terms change in a way that matters, we will say so in the app before the change takes effect.",
        ] },
      ],
    },
    ar: {
      title: "الشروط",
      summary: "شروط استخدام The Scent Handbook: الحاسبة والأدلة والتطبيق.",
      sections: [
        { id: "service", h: "الخدمة", p: [
          "The Scent Handbook حاسبة ودليل عمل وتطبيق لتسجيل الخلطات لمن يخفّفون زيت العطر بكحول العطور في المنزل. يديره [OWNER: الاسم القانوني، والبلد].",
          "الخطة المجانية مجانية. خطة Pro في مرحلة الوصول المبكر وليست معروضة للبيع؛ وإن طُرحت للبيع فستُعرض الأسعار وشروط الدفع قبل أن تدفع أي شيء.",
        ] },
        { id: "safety", h: "السلامة مسؤوليتك", p: [
          "كحول العطور سريع الاشتعال، وقد تهيّج زيوت العطر الجلد والعينين أو تسبب الحساسية. اعمل بعيدًا عن اللهب والحرارة في غرفة جيدة التهوية، وأبقِ المواد بعيدًا عن الأطفال والحيوانات الأليفة. اقرأ صحيفة بيانات السلامة لكل مادة تستخدمها.",
          "الأرقام التي يعطيها التطبيق نقاط انطلاق محسوبة من كثافات مرجعية، وليست ضمانات. تحقّق من الأوزان على ميزانك. أنت مسؤول عمّا تصنعه وكيف تستخدمه، وعن سلامته لك ولمن تعطيه إياه.",
          "لا شيء هنا نصيحة طبية أو قانونية أو تنظيمية. قد يتطلب بيع ما تصنعه تقييمات سلامة وملصقات وفق القوانين حيث تعيش.",
        ] },
        { id: "account", h: "حسابك", p: [
          "حافظ على أمان تسجيل دخولك. حساب واحد لكل شخص.",
          "لا تستخدم التطبيق لمخالفة القانون أو لمهاجمته أو إثقاله أو لنسخ الفهرس آليًا.",
          "قد نعلّق الحساب الذي يفعل ذلك، بعد إخبارك بالسبب متى أمكن.",
        ] },
        { id: "content", h: "المحتوى", p: [
          "الأدلة ونص الكتيّب © Hisham Shiboob. يمكنك قراءتها وطباعتها ومشاركة روابطها؛ نرجو ألا تعيد نشرها.",
          "ما تحفظه ملكك. يمكنك تنزيله أو حذفه في أي وقت من حسابك.",
          "العطور التي تضيفها إلى الفهرس المشترك قد تظهر لمستخدمين آخرين بعد الموافقة عليها.",
        ] },
        { id: "ai", h: "اسأل (الذكاء الاصطناعي)", p: [
          "يكتب إجابات «اسأل» نموذج ذكاء اصطناعي وقد تكون خاطئة. تعامل معها كاقتراحات وراجع كل ما يهمّك في الأدلة.",
        ] },
        { id: "liability", h: "المسؤولية", p: [
          "[OWNER: بند تحديد المسؤولية والقانون الواجب التطبيق، يصوغه محامٍ لبلدك.]",
        ] },
        { id: "changes", h: "التغييرات", p: [
          "إن تغيّرت هذه الشروط تغييرًا مهمًا فسنعلن ذلك في التطبيق قبل سريانه.",
        ] },
      ],
    },
  },
};

export const LEGAL_PAGES = Object.keys(LEGAL);
