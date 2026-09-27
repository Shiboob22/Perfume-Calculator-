// Arabic UI strings — drafts, pending the owner's review.
// The product name stays in English until the owner picks an Arabic name.
export default {
  brand: "The Scent Handbook",
  language: { switchTo: "English", switchLabel: "التبديل إلى الإنجليزية" },
  app: {
    loading: "جارٍ التحميل…",
    signOut: "تسجيل الخروج",
    tabs: {
      search: "بحث",
      calculator: "الحاسبة",
      batches: "الدفعات",
      inventory: "المخزون",
      ask: "اسأل",
    },
  },
  plan: {
    pro: "Pro",
    names: { free: "المجانية", pro: "Pro" },
    earlyAccess: "خطة Pro في مرحلة الوصول المبكر وليست متاحة للشراء بعد.",
    locked: {
      ai: { ask: "ميزة «اسأل» جزء من خطة Pro." },
      inventory: "المخزون جزء من خطة Pro.",
    },
    usage: "{used} من {cap} دفعة",
    batchCap: "تحتفظ خطة {plan} بما يصل إلى {cap} دفعة. لن يُحذف شيء؛ تسجيل المزيد يتطلب خطة Pro.",
  },
  calculator: {
    log: {
      untracked: "هذا الزيت غير موجود في مخزونك، لذلك لم يُخصم شيء من الكمية.",
      stockFailed: "حُفظت دفعتك، لكن تعذّر تحديث المخزون: {error}",
    },
  },
  auth: {
    loading: "جارٍ تحميل The Scent Handbook…",
    signIn: "تسجيل الدخول",
    checkInbox: "تفقّد بريدك الإلكتروني",
    sentLinkTo: "أرسلنا رابط تسجيل الدخول إلى",
    useDifferent: "استخدم بريدًا أو طريقة أخرى",
    continueGoogle: "المتابعة باستخدام Google",
    continueApple: "المتابعة باستخدام Apple",
    orMagicLink: "أو برابط سحري",
    emailLabel: "البريد الإلكتروني",
    emailPlaceholder: "you@example.com",
    sendLink: "إرسال الرابط السحري",
    sendingLink: "جارٍ إرسال الرابط…",
    sendFailed: "تعذّر إرسال الرابط السحري.",
    oauthFailed: "تعذّر تسجيل الدخول باستخدام {provider}.",
  },
};
