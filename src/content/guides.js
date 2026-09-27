// Guides drawn from The Scent Handbook, Vol. III Formulation, by Hisham
// Shiboob. The English follows the handbook's own wording; the Arabic is a
// draft translation (needsReview) until the author approves it.
//
// Body blocks:
//   { h2, id }                        section heading (id = stable anchor, same in every language)
//   { p }                             paragraph
//   { list: [...] }                   bullet list
//   { steps: [{ id?, title, text }] } numbered steps
//   { table: { head, rows } }         table (stacks into cards on a phone)
//   { formula: [...] }                equations, always laid out left to right
//   { callout: { kind, title, text } } caution | important | rule
//   { quote }                         pull quote

const QUICK_REFERENCE = [
  ["30 ml", "15% EDT", "4.28 g", "20.66 g", "24.94 g"],
  ["30 ml", "20% EDP", "5.70 g", "19.44 g", "25.14 g"],
  ["30 ml", "25% EDP Intense", "7.13 g", "18.23 g", "25.36 g"],
  ["30 ml", "30% Extrait", "8.55 g", "17.01 g", "25.56 g"],
  ["50 ml", "15% EDT", "7.13 g", "34.43 g", "41.56 g"],
  ["50 ml", "20% EDP", "9.50 g", "32.40 g", "41.90 g"],
  ["50 ml", "25% EDP Intense", "11.88 g", "30.38 g", "42.26 g"],
  ["50 ml", "30% Extrait", "14.25 g", "28.35 g", "42.60 g"],
  ["100 ml", "15% EDT", "14.25 g", "68.85 g", "83.10 g"],
  ["100 ml", "20% EDP", "19.00 g", "64.80 g", "83.80 g"],
  ["100 ml", "25% EDP Intense", "23.75 g", "60.75 g", "84.50 g"],
  ["100 ml", "30% Extrait", "28.50 g", "56.70 g", "85.20 g"],
];

const AR_STRENGTH = { "15% EDT": "15% EDT", "20% EDP": "20% EDP", "25% EDP Intense": "25% EDP إنتنس", "30% Extrait": "30% إكستريه" };
const arRow = ([bottle, strength, ...grams]) => [bottle.replace("ml", "مل"), AR_STRENGTH[strength], ...grams.map((g) => g.replace(" g", " غ"))];

export const GUIDES = [
  {
    slug: "why-weigh",
    source: { volume: "III", book: "Formulation", sections: ["01", "12"] },
    calculator: null,
    en: {
      title: "Why weigh, not measure",
      summary: "Professional formulation is done by mass. The two reference densities, and the limits of both.",
      body: [
        { h2: "The principle", id: "principle" },
        { p: "Professional fragrance formulation is carried out by mass (grams), not volume (millilitres). Volume shifts slightly with temperature — a measured 25 ml at a warm room is not quite the same 25 ml in a cool one. Mass does not move. A precision scale gives a repeatable measurement that a graduated cylinder cannot." },
        { p: "This handbook works from two reference densities. They are calculation assumptions for bench use — not universal constants." },
        { h2: "Reference densities", id: "reference-densities" },
        { table: { head: ["Material", "Reference density"], rows: [["Fragrance oil / concentrate", "0.95 g/ml"], ["96% ethanol", "0.81 g/ml"]] } },
        { callout: { kind: "important", title: "Important", text: "Actual fragrance concentrates vary in density by material and supplier. For production-grade accuracy, use the supplier's measured density, or determine the density of the specific batch you are working with. Treat the table in this handbook as a bench-ready starting point, not a certificate of analysis." } },
        { h2: "On accuracy", id: "on-accuracy" },
        { p: "This handbook is a practical weighing reference built on the stated density assumptions of 0.95 g/ml for fragrance oil and 0.81 g/ml for 96% ethanol." },
        { p: "For professional or commercial production, do not treat the quick-reference table as universally applicable to every concentrate. Different concentrates carry different densities, and the actual final volume after blending can differ from the nominal sum of component volumes. Validate specific materials and the formulation method whenever accuracy is critical." },
        { quote: "Precision is not about weighing more carefully once. It is about using the same controlled method every time." },
      ],
    },
    ar: {
      needsReview: true,
      title: "لماذا نزن ولا نقيس بالحجم",
      summary: "التركيب الاحترافي يتم بالكتلة. الكثافتان المرجعيتان، وحدود كلٍّ منهما.",
      body: [
        { h2: "المبدأ", id: "principle" },
        { p: "يُجرى التركيب العطري الاحترافي بالكتلة (بالغرام) لا بالحجم (بالمليلتر). يتغيّر الحجم قليلًا مع الحرارة — فـ 25 مل مقيسة في غرفة دافئة ليست تمامًا 25 مل في غرفة باردة. أما الكتلة فلا تتغيّر. يمنحك الميزان الدقيق قياسًا قابلًا للتكرار لا تمنحه الأسطوانة المدرّجة." },
        { p: "يعتمد هذا الدليل على كثافتين مرجعيتين. إنهما افتراضان حسابيان للعمل على طاولة التحضير — لا ثوابت عامة." },
        { h2: "الكثافات المرجعية", id: "reference-densities" },
        { table: { head: ["المادة", "الكثافة المرجعية"], rows: [["زيت العطر / المركّز", "0.95 غ/مل"], ["إيثانول 96%", "0.81 غ/مل"]] } },
        { callout: { kind: "important", title: "مهم", text: "تختلف كثافة مركّزات العطور الفعلية باختلاف المادة والمورّد. للحصول على دقة إنتاجية، استخدم الكثافة المقيسة من المورّد، أو حدّد كثافة الدفعة التي تعمل عليها. تعامل مع جدول هذا الدليل كنقطة انطلاق جاهزة للعمل، لا كشهادة تحليل." } },
        { h2: "عن الدقة", id: "on-accuracy" },
        { p: "هذا الدليل مرجع عملي للوزن مبني على افتراضَي الكثافة المعلنين: 0.95 غ/مل لزيت العطر و0.81 غ/مل للإيثانول 96%." },
        { p: "في الإنتاج الاحترافي أو التجاري، لا تعامل جدول المرجع السريع على أنه يصلح لكل مركّز. فالمركّزات تختلف في كثافتها، وقد يختلف الحجم النهائي الفعلي بعد الخلط عن المجموع الاسمي لحجوم المكوّنات. تحقّق من المواد المحددة ومن طريقة التركيب كلما كانت الدقة حاسمة." },
        { quote: "الدقة ليست أن تزن بعناية أكبر مرة واحدة، بل أن تستخدم الطريقة المنضبطة نفسها في كل مرة." },
      ],
    },
  },
  {
    slug: "the-calculation",
    source: { volume: "III", book: "Formulation", sections: ["02", "03", "11"] },
    calculator: { mode: "a", size: 100, unit: "ml", conc: 25 },
    en: {
      title: "The calculation",
      summary: "From a target volume and concentration to two numbers on the scale — with the quick-reference table and worked examples.",
      body: [
        { h2: "From volume to mass", id: "formula" },
        { p: "For a target volume V and oil concentration C, the component volumes are found first, then converted to mass using each material's reference density." },
        { formula: ["Oil volume = V × C", "Alcohol volume = V × (1 − C)", "Oil mass = V × C × 0.95", "Alcohol mass = V × (1 − C) × 0.81"] },
        { p: "The final batch weight is simply the sum of the two component masses." },
        { h2: "Worked: 100 ml at 25%", id: "worked-100-25" },
        { table: { head: ["", "Mass", "From"], rows: [["Oil", "23.75 g", "25 ml × 0.95"], ["Alcohol", "60.75 g", "75 ml × 0.81"], ["Total batch weight", "84.50 g", ""]] } },
        { h2: "Quick reference", id: "quick-reference" },
        { p: "Direct-weighing values for the bottle sizes and concentrations used most." },
        { table: { head: ["Bottle", "Concentration", "Oil", "Alcohol", "Total"], rows: QUICK_REFERENCE } },
        { p: "Figures are calculated at 0.95 g/ml (oil) and 0.81 g/ml (96% ethanol)." },
        { h2: "Worked examples", id: "worked-examples" },
        { list: [
          "30 ml · 20% EDP — 5.70 g oil, 19.44 g alcohol, 25.14 g total.",
          "50 ml · 25% EDP Intense — 11.88 g oil, 30.38 g alcohol, 42.26 g total.",
          "100 ml · 30% Extrait — 28.50 g oil, 56.70 g alcohol, 85.20 g total.",
        ] },
      ],
    },
    ar: {
      needsReview: true,
      title: "الحساب",
      summary: "من الحجم والتركيز المستهدفين إلى رقمين على الميزان — مع جدول المرجع السريع والأمثلة المحلولة.",
      body: [
        { h2: "من الحجم إلى الكتلة", id: "formula" },
        { p: "لحجم مستهدف V وتركيز زيت C، نحسب حجوم المكوّنات أولًا، ثم نحوّلها إلى كتلة باستخدام الكثافة المرجعية لكل مادة." },
        { formula: ["Oil volume = V × C", "Alcohol volume = V × (1 − C)", "Oil mass = V × C × 0.95", "Alcohol mass = V × (1 − C) × 0.81"] },
        { p: "وزن الدفعة النهائي هو ببساطة مجموع كتلتَي المكوّنين." },
        { h2: "مثال: 100 مل بتركيز 25%", id: "worked-100-25" },
        { table: { head: ["", "الكتلة", "من"], rows: [["الزيت", "23.75 غ", "25 مل × 0.95"], ["الكحول", "60.75 غ", "75 مل × 0.81"], ["وزن الدفعة الإجمالي", "84.50 غ", ""]] } },
        { h2: "المرجع السريع", id: "quick-reference" },
        { p: "قيم الوزن المباشر لأحجام الزجاجات والتركيزات الأكثر استخدامًا." },
        { table: { head: ["الزجاجة", "التركيز", "الزيت", "الكحول", "الإجمالي"], rows: QUICK_REFERENCE.map(arRow) } },
        { p: "الأرقام محسوبة على 0.95 غ/مل (للزيت) و0.81 غ/مل (للإيثانول 96%)." },
        { h2: "أمثلة محلولة", id: "worked-examples" },
        { list: [
          "30 مل · 20% EDP — 5.70 غ زيت، 19.44 غ كحول، 25.14 غ إجمالي.",
          "50 مل · 25% EDP إنتنس — 11.88 غ زيت، 30.38 غ كحول، 42.26 غ إجمالي.",
          "100 مل · 30% إكستريه — 28.50 غ زيت، 56.70 غ كحول، 85.20 غ إجمالي.",
        ] },
      ],
    },
  },
  {
    slug: "at-the-bench",
    source: { volume: "III", book: "Formulation", sections: ["04", "05", "06", "07", "08", "09", "10"] },
    calculator: null,
    en: {
      title: "At the bench",
      summary: "Setup, weighing the oil and the alcohol, mixing, the Five Precision Rules and quality control: the method on one page.",
      body: [
        { h2: "Bench setup", id: "setup" },
        { p: "What to have in place before the scale is switched on:" },
        { list: ["Precision digital scale, 0.01 g readability", "Clean fragrance bottle or mixing vessel", "Fragrance concentrate / oil", "96% ethanol", "Pipette, syringe, or suitable transfer tool", "Paper towels / lint-free wipes", "Labels and permanent marker", "Gloves and eye protection"] },
        { p: "Work area: Clean → Dry → Stable → Ventilated → Away from ignition sources." },
        { callout: { kind: "caution", title: "Caution — flammable", text: "Ethanol is highly flammable. Keep the work area away from flames, sparks, cigarettes, hot surfaces, and other ignition sources. Follow the safety information supplied with your ethanol and fragrance materials." } },
        { h2: "Weighing the oil", id: "weighing-oil" },
        { steps: [
          { title: "Prepare the bottle", text: "Make sure the bottle and equipment are clean and completely dry. Place the empty bottle or mixing vessel centrally on the scale." },
          { title: "Tare the scale", text: "Wait for the reading to stabilize, then press TARE. The display should return to 0.00 g." },
          { title: "Add the oil", text: "Slowly add the fragrance concentrate until the scale reaches the exact oil target. Add slowly near the target — do not correct a large overshoot by removing material unless you have a controlled procedure for it." },
          { title: "Confirm", text: "Pause and confirm the reading is stable. Record the actual weight if you are keeping a batch record." },
        ] },
        { h2: "Adding the alcohol", id: "adding-alcohol" },
        { steps: [
          { title: "Tare again", text: "With the oil already in the vessel, press TARE again. The scale should return to 0.00 g while retaining the oil already in the vessel." },
          { title: "Add ethanol", text: "Slowly add the required ethanol weight, stopping at the target and allowing the display to stabilize." },
          { title: "Close immediately", text: "Seal the bottle or vessel securely to minimize evaporation and contamination." },
        ] },
        { callout: { kind: "rule", title: "Rule 1 — always tare fresh", text: "Never mentally subtract the previous component's weight. Tare the scale and weigh the next component directly." } },
        { h2: "Mixing", id: "mixing" },
        { list: ["Confirm the container is sealed.", "Hold the bottle securely.", "Mix with a gentle, controlled motion for approximately 60 seconds.", "Avoid violent shaking that can introduce unnecessary air bubbles.", "Wipe the exterior clean and label the batch."] },
        { p: "Suggested label: fragrance, concentration, bottle size, oil lot / batch, date, oil weight, alcohol weight, total weight." },
        { h2: "The Five Precision Rules", id: "precision-rules" },
        { steps: [
          { id: "rule-1", title: "Tare before every component", text: "Never mentally subtract the previous component. Tare the scale and weigh the next component directly." },
          { id: "rule-2", title: "Add slowly", text: "At 0.01 g resolution, the last few tenths of a gram require controlled, deliberate dispensing." },
          { id: "rule-3", title: "Stabilize before recording", text: "Air movement, vibration, warm containers, and touching the vessel can all make the reading fluctuate." },
          { id: "rule-4", title: "Keep components at a consistent temperature", text: "The calculations assume the stated reference densities. Temperature affects density, and therefore the relationship between volume and mass." },
          { id: "rule-5", title: "Record actual weights", text: "For repeatability, record what was actually weighed — not only the intended target." },
        ] },
        { h2: "Quality control", id: "quality-control" },
        { p: "Verify before releasing a finished batch:" },
        { list: ["Correct bottle size selected", "Correct concentration selected", "Correct oil weight used", "Correct alcohol weight used", "Scale was tared correctly", "Components were clean and uncontaminated", "Container was sealed after mixing", "Batch was labelled", "Date and batch details were recorded", "Appearance checked for unexpected cloudiness, separation, or particles"] },
        { callout: { kind: "important", title: "If something looks unusual", text: "Do not assume it is acceptable. Check the raw-material specifications and your formulation procedure before use." } },
        { h2: "Bench workflow", id: "workflow" },
        { steps: [
          { title: "Prepare", text: "Clean equipment, prepare materials, ventilate the workspace, keep ethanol away from ignition sources." },
          { title: "Weigh oil", text: "Bottle on scale → TARE → add oil → stabilize → record." },
          { title: "Weigh alcohol", text: "TARE again → add ethanol → stabilize → record." },
          { title: "Mix", text: "Seal the vessel → mix gently for approximately 60 seconds." },
          { title: "Finish", text: "Label → record batch → inspect → store appropriately." },
        ] },
      ],
    },
    ar: {
      needsReview: true,
      title: "على طاولة التحضير",
      summary: "التجهيز، ووزن الزيت والكحول، والخلط، وقواعد الدقة الخمس، وفحص الجودة: الطريقة كاملة في صفحة واحدة.",
      body: [
        { h2: "تجهيز طاولة التحضير", id: "setup" },
        { p: "ما يجب أن يكون جاهزًا قبل تشغيل الميزان:" },
        { list: ["ميزان رقمي دقيق بقراءة 0.01 غ", "زجاجة عطر أو وعاء خلط نظيف", "مركّز العطر / الزيت", "إيثانول 96%", "ماصّة أو محقنة أو أداة نقل مناسبة", "مناديل ورقية / مناديل خالية من الوبر", "ملصقات وقلم ثابت", "قفازات وواقٍ للعينين"] },
        { p: "مكان العمل: نظيف ← جاف ← ثابت ← جيد التهوية ← بعيد عن مصادر الاشتعال." },
        { callout: { kind: "caution", title: "تنبيه — قابل للاشتعال", text: "الإيثانول شديد الاشتعال. أبقِ مكان العمل بعيدًا عن اللهب والشرر والسجائر والأسطح الساخنة وأي مصادر اشتعال أخرى. اتبع معلومات السلامة المرفقة مع الإيثانول ومواد العطر." } },
        { h2: "وزن الزيت", id: "weighing-oil" },
        { steps: [
          { title: "جهّز الزجاجة", text: "تأكد أن الزجاجة والأدوات نظيفة وجافة تمامًا. ضع الزجاجة الفارغة أو وعاء الخلط في منتصف الميزان." },
          { title: "صفّر الميزان", text: "انتظر حتى تستقر القراءة، ثم اضغط TARE. يجب أن تعود الشاشة إلى 0.00 غ." },
          { title: "أضف الزيت", text: "أضف مركّز العطر ببطء حتى يصل الميزان إلى هدف الزيت بالضبط. أضف ببطء قرب الهدف — لا تصحّح تجاوزًا كبيرًا بسحب المادة ما لم تكن لديك طريقة منضبطة لذلك." },
          { title: "تأكّد", text: "توقّف وتأكّد من استقرار القراءة. سجّل الوزن الفعلي إن كنت تحتفظ بسجل للدفعات." },
        ] },
        { h2: "إضافة الكحول", id: "adding-alcohol" },
        { steps: [
          { title: "صفّر مرة أخرى", text: "والزيت في الوعاء، اضغط TARE مرة أخرى. يجب أن يعود الميزان إلى 0.00 غ مع بقاء الزيت في الوعاء." },
          { title: "أضف الإيثانول", text: "أضف وزن الإيثانول المطلوب ببطء، وتوقّف عند الهدف واترك الشاشة تستقر." },
          { title: "أغلق فورًا", text: "أحكم إغلاق الزجاجة أو الوعاء لتقليل التبخّر والتلوّث." },
        ] },
        { callout: { kind: "rule", title: "القاعدة 1 — صفّر من جديد دائمًا", text: "لا تطرح وزن المكوّن السابق ذهنيًا أبدًا. صفّر الميزان وزِن المكوّن التالي مباشرة." } },
        { h2: "الخلط", id: "mixing" },
        { list: ["تأكّد أن الوعاء مغلق.", "أمسك الزجاجة بثبات.", "اخلط بحركة لطيفة منضبطة لمدة 60 ثانية تقريبًا.", "تجنّب الرجّ العنيف الذي قد يُدخل فقاعات هواء غير ضرورية.", "امسح السطح الخارجي وضع ملصقًا على الدفعة."] },
        { p: "الملصق المقترح: العطر، التركيز، حجم الزجاجة، رقم دفعة الزيت، التاريخ، وزن الزيت، وزن الكحول، الوزن الإجمالي." },
        { h2: "قواعد الدقة الخمس", id: "precision-rules" },
        { steps: [
          { id: "rule-1", title: "صفّر قبل كل مكوّن", text: "لا تطرح المكوّن السابق ذهنيًا أبدًا. صفّر الميزان وزِن المكوّن التالي مباشرة." },
          { id: "rule-2", title: "أضف ببطء", text: "بدقة 0.01 غ، تحتاج الأعشار الأخيرة من الغرام إلى صبّ متأنٍّ ومنضبط." },
          { id: "rule-3", title: "انتظر الاستقرار قبل التسجيل", text: "حركة الهواء والاهتزاز والأوعية الدافئة ولمس الوعاء كلها قد تجعل القراءة تتذبذب." },
          { id: "rule-4", title: "حافظ على حرارة ثابتة للمكوّنات", text: "تفترض الحسابات الكثافات المرجعية المعلنة. تؤثّر الحرارة في الكثافة، وبالتالي في العلاقة بين الحجم والكتلة." },
          { id: "rule-5", title: "سجّل الأوزان الفعلية", text: "لضمان التكرار، سجّل ما وُزن فعلًا — لا الهدف المقصود فقط." },
        ] },
        { h2: "فحص الجودة", id: "quality-control" },
        { p: "تحقّق قبل اعتماد أي دفعة منتهية:" },
        { list: ["اختيار حجم الزجاجة الصحيح", "اختيار التركيز الصحيح", "استخدام وزن الزيت الصحيح", "استخدام وزن الكحول الصحيح", "تصفير الميزان بشكل صحيح", "نظافة المكوّنات وخلوّها من التلوّث", "إغلاق الوعاء بعد الخلط", "وضع ملصق على الدفعة", "تسجيل التاريخ وتفاصيل الدفعة", "فحص المظهر بحثًا عن عكارة أو انفصال أو جزيئات غير متوقعة"] },
        { callout: { kind: "important", title: "إن بدا شيء غير عادي", text: "لا تفترض أنه مقبول. راجع مواصفات المواد الخام وطريقة التركيب قبل الاستخدام." } },
        { h2: "مسار العمل", id: "workflow" },
        { steps: [
          { title: "التجهيز", text: "نظّف الأدوات، جهّز المواد، هوِّ مكان العمل، أبعد الإيثانول عن مصادر الاشتعال." },
          { title: "وزن الزيت", text: "الزجاجة على الميزان ← TARE ← أضف الزيت ← انتظر الاستقرار ← سجّل." },
          { title: "وزن الكحول", text: "TARE مرة أخرى ← أضف الإيثانول ← انتظر الاستقرار ← سجّل." },
          { title: "الخلط", text: "أغلق الوعاء ← اخلط بلطف لمدة 60 ثانية تقريبًا." },
          { title: "الإنهاء", text: "ضع الملصق ← سجّل الدفعة ← افحص ← خزّن بشكل مناسب." },
        ] },
      ],
    },
  },
];

export function guideBySlug(slug) {
  return GUIDES.find((g) => g.slug === slug) || null;
}
