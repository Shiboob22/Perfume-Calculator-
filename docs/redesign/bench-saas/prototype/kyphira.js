// Kyphira bench prototype helpers. Numbers ported from the repo:
// src/lib/formulation.ts (FAMILIES, STRENGTHS, densities), src/lib/calc/{blend,solve,basis,round,pour,density}.ts,
// src/lib/pourProgress.js, src/lib/theme.js (PALETTES). Exposed as window.Kx.
(function () {
  const PALETTES = {
    light: { paper: "#F4F1EA", card: "#FBF9F4", cardHi: "#FFFDF9", sand: "#EBE6DA", ink: "#1B1814", inkSoft: "#3A352D", dim: "#5A544A", amber: "#B8893A", actionText: "#7A581B", onAmber: "#1B1814", oil: "#B8893A", mist: "#E4EBE5", inkBand: "#1B1814", onInk: "#F4F1EA", line: "#D9D3C5", field: "#827A6B", ember: "#B3361A", danger: "#9B2C1F", dangerBg: "#FBF1EE", dangerLine: "#E5C9C1", verdigris: "#2F6F62", verdigrisText: "#2F6F62", hair: "rgba(27,24,20,0.10)", shadow: "8px 8px 0 #EBE6DA" },
    dark: { paper: "#14110E", card: "#1C1713", cardHi: "#26201A", sand: "#26201A", ink: "#EADFCE", inkSoft: "#A89B8B", dim: "#A89B8B", amber: "#D4924A", actionText: "#D4924A", onAmber: "#100E0A", oil: "#D4924A", mist: "#3A4A42", inkBand: "#0D0B09", onInk: "#EADFCE", line: "#3B332B", field: "#857A60", ember: "#E26A4F", danger: "#E07A62", dangerBg: "#2A140E", dangerLine: "#5A2A1C", verdigris: "#5E8C7A", verdigrisText: "#9DB38A", hair: "rgba(234,223,206,0.12)", shadow: "none" },
  };
  const cssVar = (k) => `--c-${k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`;
  function vars(theme, lang) {
    const p = PALETTES[theme] || PALETTES.light;
    const o = {};
    for (const k in p) o[cssVar(k)] = p[k];
    o["--f-serif"] = lang === "ar" ? "'Reem Kufi', 'Readex Pro', serif" : "'Instrument Serif', Georgia, serif";
    o["--f-sans"] = lang === "ar" ? "'Readex Pro', 'Instrument Sans', system-ui, sans-serif" : "'Instrument Sans', system-ui, sans-serif";
    o.background = p.paper; o.color = p.ink; o.colorScheme = theme;
    o.fontFamily = o["--f-sans"];
    return o;
  }

  const ETHANOL = 0.81;
  const FAMILIES = {
    fresh: { density: 0.87, conc: 20, en: "Fresh", ar: "منعش", subEn: "Aromatic · Citrus · Water · Green · Fruity", subAr: "عطري · حمضي · مائي · أخضر · فاكهي", color: "#7E9A7C" },
    floral: { density: 0.95, conc: 25, en: "Floral", ar: "زهري", subEn: "Floral · Soft Floral · Floral Amber", subAr: "زهري · زهري ناعم · زهري عنبري", color: "#B98C93" },
    woody: { density: 0.93, conc: 22, en: "Woody", ar: "خشبي", subEn: "Woods · Mossy Woods · Dry Woods", subAr: "أخشاب · أخشاب طحلبية · أخشاب جافة", color: "#6E6248" },
    oriental: { density: 1.02, conc: 30, en: "Amber (Oriental)", ar: "عنبري (شرقي)", subEn: "Soft Amber · Amber · Woody Amber", subAr: "عنبر ناعم · عنبر · عنبر خشبي", color: "#5B3A2E" },
    gourmand: { density: 1.0, conc: 25, en: "Gourmand", ar: "حلو (غورمان)", subEn: "Vanilla · Praline · Tobacco-Honey", subAr: "فانيليا · برالين · تبغ وعسل", color: "#A9793C" },
  };
  const FAMILY_KEYS = ["fresh", "floral", "woody", "oriental", "gourmand"];
  // Concentration tiers. A tier holds every % up to and including its max; tapping one sets its default pct.
  const STRENGTHS = [
    { name: "EdC", ar: "كولونيا", min: 2, max: 5, pct: 4 },
    { name: "EdT", ar: "تواليت", min: 5, max: 15, pct: 10 },
    { name: "EdP", ar: "أو دو بارفان", min: 15, max: 20, pct: 18 },
    { name: "Parfum", ar: "بارفان", min: 20, max: 30, pct: 25 },
    { name: "Extrait", ar: "مستخلص", min: 30, max: 40, pct: 35 },
  ];
  const tierFor = (p) => STRENGTHS.find((x) => Number(p) <= x.max) || STRENGTHS[STRENGTHS.length - 1];

  // Saved formulas (seed library) and plan data. Prices are placeholders.
  const FORMULAS = [
    { id: 1, name: "Amber Room", family: "oriental", size: 50, unit: "ml", pct: 30 },
    { id: 2, name: "Neroli Eau", family: "fresh", size: 100, unit: "ml", pct: 10 },
    { id: 3, name: "Tuberose Soir", family: "floral", size: 50, unit: "ml", pct: 18 },
    { id: 4, name: "Santal Dry", family: "woody", size: 30, unit: "ml", pct: 22 },
    { id: 5, name: "Tonka Praline", family: "gourmand", size: 50, unit: "ml", pct: 25 },
  ];
  const PLAN = { freeFormulas: 5, freeIngredients: 3, freeBatches: 3, monthly: 9, yearly: 90, currency: "$" };

  // Blends: ingredient types (typical densities, g/mL) and a seed blend. Shares are % of the concentrate by weight.
  const INGREDIENT_TYPES = {
    eo: { density: 0.9, color: "#9DB07A" },
    aroma: { density: 1.0, color: "#C9A157" },
    absolute: { density: 1.02, color: "#8C5426" },
    fixative: { density: 1.05, color: "#6E6248" },
    dpg: { density: 1.02, color: "#BFC7C0" },
  };
  const INGREDIENT_KEYS = ["eo", "aroma", "absolute", "fixative", "dpg"];
  const BLEND_SEED = [
    { id: 1, name: "Bergamot", type: "eo", pct: 40, price: 6 },
    { id: 2, name: "Hedione", type: "aroma", pct: 40, price: 3 },
    { id: 3, name: "Ambroxan", type: "aroma", pct: 20, price: 9 },
  ];
  // Blend density from weight shares: 1 / Σ(wᵢ/ρᵢ). avgPrice is per gram of concentrate.
  function blendMix(list) {
    const ok = (list || []).filter((i) => Number(i.pct) > 0);
    const sum = ok.reduce((a, i) => a + Number(i.pct), 0);
    if (!(sum > 0)) return { sum: 0, dens: null, avgPrice: 0, parts: [] };
    let inv = 0, price = 0;
    const parts = ok.map((i) => { const w = Number(i.pct) / sum; const rho = (INGREDIENT_TYPES[i.type] || INGREDIENT_TYPES.eo).density; inv += w / rho; price += w * (Number(i.price) || 0); return { id: i.id, w, rho }; });
    return { sum, dens: 1 / inv, avgPrice: price, parts };
  }

  // Rest tracker: milestones, tags and seed batches. Notes are keyed by milestone.
  const MILESTONES = [
    { k: "d1", days: 0, en: "Day 1", ar: "اليوم 1" },
    { k: "w1", days: 7, en: "Week 1", ar: "الأسبوع 1" },
    { k: "w2", days: 14, en: "Week 2", ar: "الأسبوع 2" },
    { k: "m1", days: 30, en: "Month 1", ar: "الشهر 1" },
    { k: "m3", days: 90, en: "Month 3", ar: "الشهر 3" },
  ];
  const TAGS = [
    { k: "harsh", en: "Harsh", ar: "قاسٍ" }, { k: "sharp", en: "Sharp top", ar: "افتتاحية حادة" }, { k: "rounder", en: "Rounder", ar: "أكثر استدارة" },
    { k: "sweeter", en: "Sweeter", ar: "أحلى" }, { k: "woodier", en: "Woodier", ar: "أكثر خشبية" }, { k: "fading", en: "Fading", ar: "يخفت" }, { k: "ready", en: "Ready", ar: "جاهز" },
  ];
  const JOURNAL = [
    { no: 41, name: "Amber Room", family: "oriental", size: 50, pct: 30, poured: "2026-10-28", remind: false, notes: { d1: { text: "Alcohol bite on top, amber and labdanum underneath. Loud.", rating: 2, tags: ["harsh", "sharp"] } } },
    { no: 40, name: "Neroli Eau", family: "fresh", size: 100, pct: 10, poured: "2026-10-21", remind: true, notes: { d1: { text: "Bright neroli, thin. Ethanol very present.", rating: 2, tags: ["sharp"] }, w1: { text: "Ethanol calming down. Petitgrain coming through.", rating: 3, tags: ["rounder"] } } },
    { no: 39, name: "Santal Dry", family: "woody", size: 30, pct: 22, poured: "2026-09-15", remind: false, notes: { d1: { text: "Dry and scratchy. Cedar dominates.", rating: 2, tags: ["harsh"] }, w1: { text: "Sandalwood starting to show.", rating: 3, tags: ["woodier"] }, w2: { text: "Creamier. Less scratch.", rating: 3, tags: ["rounder", "woodier"] }, m1: { text: "Smooth, milky wood. Close to done.", rating: 4, tags: ["rounder"] } } },
    { no: 38, name: "Tuberose Soir", family: "floral", size: 50, pct: 18, poured: "2026-08-01", remind: false, notes: { d1: { text: "Green, almost rubbery tuberose.", rating: 2, tags: ["sharp"] }, w1: { text: "Still green.", rating: 2, tags: [] }, w2: { text: "Opening up, creamy heart.", rating: 3, tags: ["rounder"] }, m1: { text: "Lush. Jasmine linking it together.", rating: 4, tags: ["sweeter"] }, m3: { text: "Ready. Full, round, lasts all evening.", rating: 5, tags: ["ready", "rounder"] } } },
    { no: 37, name: "Tonka Praline", family: "gourmand", size: 50, pct: 25, poured: "2026-07-10", remind: false, notes: { d1: { text: "Sugary and flat.", rating: 2, tags: [] }, w2: { text: "Tonka warming.", rating: 3, tags: ["sweeter"] }, m1: { text: "Almond and hay notes now.", rating: 4, tags: ["rounder"] }, m3: { text: "Done. Soft, toasted, cosy.", rating: 5, tags: ["ready"] } } },
  ];
  const COST_DEFAULTS = { oilPrice: 8, ethPrice: 150, pack: 45, margin: 60 };

  // Cost of a batch and of one bottle from it, plus a retail price at a margin (margin = share of the selling price).
  function costFor({ oilG, ethMl, totMl, bottleMl, oilPrice, ethPrice, pack, margin }) {
    const n = (v) => Math.max(Number(v) || 0, 0);
    const batch = n(oilG) * n(oilPrice) + (n(ethMl) / 1000) * n(ethPrice);
    const b = n(bottleMl), tot = n(totMl);
    const perBottle = tot > 0 && b > 0 ? (batch / tot) * b + n(pack) : 0;
    const m = Math.min(Math.max(n(margin), 0), 95) / 100;
    const retail = perBottle > 0 ? Math.ceil(perBottle / (1 - m) / 5) * 5 : 0;
    const bottles = b > 0 ? Math.floor(Number((tot / b).toPrecision(12))) : 0;
    return { batch, perBottle, retail, bottles };
  }
  const money = (x) => (Number.isFinite(x) ? Math.round(x).toLocaleString("en-US") : "—");
  const SIZES = [3, 5, 10, 20, 30, 50, 100, 125, 200];

  const INVENTORY = [
    { name: "Amber Room", family: "oriental", g: 42.5, low: 10 },
    { name: "Neroli Eau", family: "fresh", g: 9.2, low: 10 },
    { name: "Santal Dry", family: "woody", g: 118, low: 10 },
    { name: "Tuberose Soir", family: "floral", g: 26.3, low: 10 },
    { name: "Tonka Praline", family: "gourmand", g: 61, low: 10 },
  ];
  const RECENT = [
    { no: 41, name: "Amber Room", family: "oriental", size: 50, pct: 30, date: "2026-10-28" },
    { no: 40, name: "Neroli Eau", family: "fresh", size: 100, pct: 20, date: "2026-10-21" },
    { no: 39, name: "Santal Dry", family: "woody", size: 30, pct: 22, date: "2026-10-12" },
  ];

  function round2(x) {
    if (!Number.isFinite(x)) return NaN;
    const s = Number((x * 100).toPrecision(12));
    return (Math.sign(s) * Math.round(Math.abs(s))) / 100 + 0;
  }
  const fmt2 = (x) => { const r = round2(x); return Number.isFinite(r) ? r.toFixed(2) : "—"; };
  function byVolume(totalMl, c, d) { const oilMl = totalMl * c, ethanolMl = totalMl * (1 - c); const oilG = oilMl * d.oil, ethanolG = ethanolMl * d.ethanol; return { oilG, oilMl, ethanolG, ethanolMl, totalG: oilG + ethanolG, totalMl }; }
  function byWeight(totalG, c, d) { const oilG = totalG * c, ethanolG = totalG * (1 - c); const oilMl = oilG / d.oil, ethanolMl = ethanolG / d.ethanol; return { oilG, oilMl, ethanolG, ethanolMl, totalG, totalMl: oilMl + ethanolMl }; }
  const v2w = (c, d) => { const o = c * d.oil, e = (1 - c) * d.ethanol; return o + e > 0 ? o / (o + e) : NaN; };
  const w2v = (c, d) => { const o = c / d.oil, e = (1 - c) / d.ethanol; return o + e > 0 ? o / (o + e) : NaN; };
  function pourProgress(p, t, tol = 0.05) {
    p = Number(p); t = Number(t);
    if (!Number.isFinite(p) || !Number.isFinite(t) || t <= 0) return { fraction: 0, state: "under" };
    const band = t * tol;
    return { fraction: Math.min(1, Math.max(0, p / t)), state: p < t - band ? "under" : p <= t + band ? "ok" : "over" };
  }
  function alcoholForOil(oilG, pct, basis, d) { const c = pct / 100; if (!(c > 0 && c < 1) || !(oilG > 0)) return NaN; return basis === "volume" ? (oilG / d.oil / c) * (1 - c) * d.ethanol : (oilG / c) * (1 - c); }
  function measuredDensity(g, ml) { if (!(g > 0) || !(ml > 0)) return null; return { density: g / ml, plusMinus: 0.01 / ml }; }

  const S = {
    en: {
      dir: "ltr", brand: "Kyphira", motto: "Every drop, weighed with care.", by: "By Hisham Shiboob",
      nav: { bench: "Bench", journal: "Journal", library: "Library", atlas: "Atlas", salon: "Salon", nose: "Nose", wardrobe: "Wardrobe", pricing: "Pricing", account: "Account", more: "More", search: "Search", selector: "Selector", inventory: "Inventory", ask: "Ask", calculator: "Calculator" },
      lang: "العربية", themeDark: "Dark", themeLight: "Light",
      room: "The Bench", title: "Weigh a formula.", lead: "Two numbers for the scale, from a bottle size and a strength.",
      modeBottle: "Bottle", modeOil: "Oil on hand", startOver: "Start over",
      sheet: "Bench sheet", name: "Fragrance name", namePh: "The name on your oil", shelf: "On your shelf",
      family: "Family", size: "Total batch size", strength: "Target concentration", oilHave: "Oil on hand", bottle: "Bottle to fill",
      readout: "Batch readout", oil: "Fragrance oil", ethanol: "Ethanol 96%", total: "Total", byWeight: "by weight",
      pctSentence: "{v}% by volume = {w}% by weight", pctSentenceW: "{v}% by weight = {w}% by volume",
      density: "Oil density {d} g/mL", densityFamily: "family estimate", densityMeasured: "measured", measure: "Measure yours",
      nominal: "Volumes are nominal; the mix may measure slightly less.",
      precision: "A pour under 1 g: a 0.01 g display is not 0.01 g accuracy. Pour slowly, or make a larger batch.",
      rest: "Rest 3 months in a cool, dark place. Ready {date}.",
      stockOk: "{have} g on hand · {left} g left after this batch", stockLow: "Low after this batch: {left} g of {name} left (below {low} g).", stockShort: "Not enough oil: {have} g on hand, {need} g needed.", stockMax: "Largest batch you can make: {max} mL", stockNone: "Not on your shelf yet. Logging adds it.", useMax: "Use {max} mL",
      fills: "Fills {n} × {size} mL · {left} mL over", fillsNone: "Less than one {size} mL bottle",
      recent: "Recent batches", load: "Load", loaded: "Loaded",
      measureTitle: "Measure density", measureHelp: "Weigh a known volume of your oil. 10 mL is plenty.", mlLabel: "Volume (mL)", gLabel: "Weight (g)", useDensity: "Use {d} g/mL", plusMinus: "±{p} g/mL on a 0.01 g scale", reset: "Back to family estimate", cancel: "Cancel",
      benchMode: "Start bench mode", label: "Label PNG", share: "Share link", copied: "Link copied", logBatch: "Log this batch", logged: "Logged as No. {no}", copyRecipe: "Copy recipe",
      safety: "Ethanol is highly flammable. Keep away from flame, heat and children.",
      step: "Step {n} of {m}", next: "Next", back: "Back", continue: "Continue", done: "Done",
      footer: "Kyphira grew from The Scent Handbook, a printed handbook in three volumes: Application, Wardrobe and Formulation.",
      guided: { s1: "Which oil?", s2: "How much?", s3: "How strong?", s4: "Pour", s5: "Label & log" },
      sentence: { make: "Make", of: "of", at: "at", gives: "on the scale" },
      pour: {
        title: "Bench mode", tare: "Put the empty bottle on the scale and tare it.", tareBtn: "Tare", pourOil: "Pour the oil", pourEth: "Pour the ethanol", target: "Target {g} g",
        under: "Keep pouring", ok: "On target", over: "Over. Don't take any out: the ethanol will be adjusted.", adjusted: "Ethanol adjusted for the {g} g of oil you poured.",
        pourIng: "Pour the {name}", scaled: "You went over on an earlier ingredient, so the rest are scaled ×{x} to keep the blend's ratio.", concentrate: "Concentrate",
        sim: "Practice scale", hold: "Hold to pour", fine: "+0.01 g", coarse: "+1 g", reset: "Reset", finish: "Finish", doneTitle: "Done. Cap it and let it rest.", poured: "Poured", made: "Made {pct}% by volume", close: "Close", log: "Log this batch",
      },
      labelSheet: { title: "Label", download: "Download PNG", batch: "Batch", oil: "Oil", ethanol: "Ethanol 96%", total: "Total", rest: "Rest until", flammable: "Highly flammable" },
      formulas: { title: "Formulas", open: "Your formulas", search: "Search formulas", all: "All", save: "Save formula", saved: "Saved to Formulas", count: "{n} of {max} on Free", countPro: "{n} saved", empty: "No formulas match.", close: "Close" },
      cost: {
        title: "Cost per bottle", pro: "Pro", oilPrice: "Fragrance oil", ethPrice: "Ethanol 96%", pack: "Bottle & packaging",
        perG: "EGP / g", perL: "EGP / L", perBottleUnit: "EGP / bottle", cur: "EGP", bottle: "Bottle size", margin: "Margin",
        batch: "Batch cost", perBottle: "Per bottle", retail: "Suggested retail", bottles: "{n} × {size} mL bottles from this batch", fewer: "This batch is smaller than one {size} mL bottle.",
        lockTitle: "Price every bottle before you pour.", lockBody: "Batch cost, cost per bottle and a retail price at your margin, live as you change the recipe.", unlock: "Unlock with Pro",
      },
      plan: {
        free: "Free", pro: "Pro", badgeFree: "Free · Upgrade", badgePro: "Pro", title: "Kyphira Pro", lead: "For makers who sell what they pour.",
        limit: "Free keeps 5 formulas. Pro keeps every one.", locked: "That's a Pro tool.",
        monthly: "Monthly", yearly: "Yearly", saveYr: "2 months free", perMo: "/ month", perYr: "/ year", billedYr: "{m} a month, billed yearly",
        feature: "Feature", current: "Your current plan", trial: "Start 14-day free trial", trialOn: "Pro trial started", fine: "No card needed for the trial. Cancel anytime.",
        rows: [["Bench calculator & bench mode", "✓", "✓"], ["Concentration presets", "✓", "✓"], ["Blend ingredients", "3", "Unlimited"], ["Saved formulas", "5", "Unlimited"], ["Rest tracker", "Last 3 batches", "Full history"], ["Ready reminders", "—", "✓"], ["Cost per bottle & retail price", "—", "✓"], ["Label PNG export", "—", "✓"], ["Share links", "—", "✓"]],
      },
      blend: {
        mode: "Formula type", simple: "Simple", blend: "Blend", ingredients: "Ingredients", name: "Ingredient", namePh: "e.g. Bergamot", share: "Share of concentrate", type: "Type", price: "Price per gram",
        remove: "Remove ingredient", up: "Move up", down: "Move down", add: "Add ingredient", balance: "Balance to 100%", total: "Total {n}%", off: "Total {n}% · shares are scaled to 100%",
        concentrate: "Concentrate", breakdown: "Concentrate breakdown", density: "Blend density {d} g/mL · from ingredients", limit: "Free blends hold 3 ingredients. Pro has no limit.",
        types: { eo: "Essential oil", aroma: "Aroma chemical", absolute: "Absolute", fixative: "Fixative", dpg: "DPG (diluent)" },
      },
      tour: {
        take: "Take the tour", next: "Next", back: "Back", skip: "Skip tour", done: "Finish", count: "{n} / {m}", journal: "Open the Journal",
        steps: [
          ["Weigh a formula", "Pick a size and a strength. Kyphira does the weighing."],
          ["Blend like a perfumer", "Real perfumes have more than one oil. Add each one as a share of the concentrate."],
          ["Read it like a scale", "Two numbers for the scale, exact to 0.01 g."],
          ["Pour along", "Then pour along, step by step: tare, each ingredient, then ethanol."],
          ["Price every bottle", "Know your cost and retail price before you pour."],
          ["Let it rest, then sell it", "Every batch is logged, and the Journal tracks it as it rests. Pro unlocks all of it."],
        ],
      },
      journal: {
        room: "Journal", title: "Let it rest.", lead: "A batch keeps changing in the bottle. Note it as it does.", back: "The Bench", soon: "Ready soon", readyIn: "Ready in {n} days", ready: "Ready",
        batches: "Batches", poured: "Poured {date}", readyOn: "Ready {date}", remind: "Remind me when ready", reminded: "Reminder on", note: "Note", notePh: "What do you smell now?", rating: "Rating", tags: "Tags",
        save: "Save note", saved: "Note saved", empty: "No note yet.", future: "Opens {date}", compare: "Compare", compareOff: "Close compare", a: "From", b: "To", compareNone: "Add two notes to compare them.",
        locked: "{n} older batches", lockedBody: "Pro keeps every batch's rest history.", remindPro: "Reminders are a Pro tool.", started: "Logged as No. {no} · rest tracker started", meta: "{size} mL · {pct}% · {tier}", progress: "Day {n} of 90", newBadge: "New",
      },
    },
    ar: {
      dir: "rtl", brand: "كيفيرا", motto: "كل قطرة موزونة بعناية.", by: "بقلم Hisham Shiboob",
      nav: { bench: "منضدة العمل", journal: "اليوميات", library: "المكتبة", atlas: "الأطلس", salon: "الصالون", nose: "الأنف", wardrobe: "خزانة العطور", pricing: "الأسعار", account: "الحساب", more: "المزيد", search: "بحث", selector: "المُختار", inventory: "المخزون", ask: "اسأل", calculator: "الحاسبة" },
      lang: "English", themeDark: "داكن", themeLight: "فاتح",
      room: "منضدة العمل", title: "زِن تركيبتك.", lead: "رقمان للميزان، من حجم الزجاجة والتركيز.",
      modeBottle: "الزجاجة", modeOil: "الزيت المتوفر", startOver: "ابدأ من جديد",
      sheet: "ورقة العمل", name: "اسم العطر", namePh: "الاسم المكتوب على زيتك", shelf: "على رفّك",
      family: "العائلة", size: "الحجم الكلي للدفعة", strength: "التركيز المستهدف", oilHave: "الزيت المتوفر", bottle: "الزجاجة المراد ملؤها",
      readout: "نتيجة الدفعة", oil: "زيت العطر", ethanol: "إيثانول 96%", total: "المجموع", byWeight: "بالوزن",
      pctSentence: "{v}% بالحجم = {w}% بالوزن", pctSentenceW: "{v}% بالوزن = {w}% بالحجم",
      density: "كثافة الزيت {d} غ/مل", densityFamily: "تقدير العائلة", densityMeasured: "مقيسة", measure: "قِس كثافة زيتك",
      nominal: "الأحجام اسمية؛ قد تقيس الخلطة أقل بقليل.",
      precision: "سكبة أقل من 1 غ: شاشة 0.01 غ لا تعني دقة 0.01 غ. اسكب ببطء أو اصنع دفعة أكبر.",
      rest: "اتركه يرتاح 3 أشهر في مكان بارد ومظلم. جاهز {date}.",
      stockOk: "لديك {have} غ · يتبقى {left} غ بعد هذه الدفعة", stockLow: "منخفض بعد هذه الدفعة: يتبقى {left} غ من {name} (أقل من {low} غ).", stockShort: "الزيت لا يكفي: لديك {have} غ وتحتاج {need} غ.", stockMax: "أكبر دفعة يمكنك صنعها: {max} مل", stockNone: "ليس على رفّك بعد. التسجيل يضيفه.", useMax: "استخدم {max} مل",
      fills: "يملأ {n} × {size} مل · يزيد {left} مل", fillsNone: "أقل من زجاجة واحدة {size} مل",
      recent: "آخر الدفعات", load: "حمّل", loaded: "حُمّلت",
      measureTitle: "قِس الكثافة", measureHelp: "زِن حجمًا معروفًا من زيتك. 10 مل تكفي.", mlLabel: "الحجم (مل)", gLabel: "الوزن (غ)", useDensity: "استخدم {d} غ/مل", plusMinus: "±{p} غ/مل على ميزان 0.01 غ", reset: "عُد إلى تقدير العائلة", cancel: "إلغاء",
      benchMode: "ابدأ وضع العمل", label: "ملصق PNG", share: "شارك الرابط", copied: "نُسخ الرابط", logBatch: "سجّل هذه الدفعة", logged: "سُجّلت برقم {no}", copyRecipe: "انسخ الوصفة",
      safety: "الإيثانول شديد الاشتعال. أبعده عن اللهب والحرارة والأطفال.",
      step: "الخطوة {n} من {m}", next: "التالي", back: "رجوع", continue: "متابعة", done: "تم",
      footer: "نشأت كيفيرا من كتاب العطور، دليل مطبوع في ثلاثة أجزاء: الاستعمال، والخزانة، والتركيب.",
      guided: { s1: "أي زيت؟", s2: "كم؟", s3: "بأي تركيز؟", s4: "اسكب", s5: "الملصق والتسجيل" },
      sentence: { make: "اصنع", of: "من", at: "بتركيز", gives: "على الميزان" },
      pour: {
        title: "وضع العمل", tare: "ضع الزجاجة الفارغة على الميزان واضبطه على الصفر.", tareBtn: "صفّر", pourOil: "اسكب الزيت", pourEth: "اسكب الإيثانول", target: "الهدف {g} غ",
        under: "تابع السكب", ok: "على الهدف", over: "زيادة. لا تُخرج شيئًا: سيُعدَّل الإيثانول.", adjusted: "عُدّل الإيثانول حسب {g} غ من الزيت الذي سكبته.",
        pourIng: "اسكب {name}", scaled: "زدت في مكوّن سابق، فعُدّلت البقية ×{x} للحفاظ على نسب الخلطة.", concentrate: "المركّز",
        sim: "ميزان للتجربة", hold: "اضغط مطوّلًا للسكب", fine: "‎+0.01 غ", coarse: "‎+1 غ", reset: "صفّر", finish: "إنهاء", doneTitle: "تم. أغلق الزجاجة واتركها ترتاح.", poured: "المسكوب", made: "صنعت {pct}% بالحجم", close: "إغلاق", log: "سجّل هذه الدفعة",
      },
      labelSheet: { title: "الملصق", download: "نزّل PNG", batch: "الدفعة", oil: "الزيت", ethanol: "إيثانول 96%", total: "المجموع", rest: "يرتاح حتى", flammable: "شديد الاشتعال" },
      formulas: { title: "التركيبات", open: "تركيباتك", search: "ابحث في التركيبات", all: "الكل", save: "احفظ التركيبة", saved: "حُفظت في التركيبات", count: "{n} من {max} في الخطة المجانية", countPro: "{n} محفوظة", empty: "لا توجد تركيبات مطابقة.", close: "إغلاق" },
      cost: {
        title: "تكلفة الزجاجة", pro: "Pro", oilPrice: "زيت العطر", ethPrice: "إيثانول 96%", pack: "الزجاجة والتغليف",
        perG: "ج.م / غ", perL: "ج.م / لتر", perBottleUnit: "ج.م / زجاجة", cur: "ج.م", bottle: "حجم الزجاجة", margin: "هامش الربح",
        batch: "تكلفة الدفعة", perBottle: "للزجاجة", retail: "سعر البيع المقترح", bottles: "{n} × زجاجة {size} مل من هذه الدفعة", fewer: "هذه الدفعة أقل من زجاجة واحدة {size} مل.",
        lockTitle: "سعّر كل زجاجة قبل أن تسكب.", lockBody: "تكلفة الدفعة وتكلفة الزجاجة وسعر بيع بهامشك، تتحدث مباشرة مع كل تعديل في الوصفة.", unlock: "افتحها مع Pro",
      },
      plan: {
        free: "مجاني", pro: "Pro", badgeFree: "مجاني · ترقية", badgePro: "Pro", title: "كيفيرا Pro", lead: "لصنّاع العطور الذين يبيعون ما يسكبون.",
        limit: "الخطة المجانية تحفظ 5 تركيبات. Pro تحفظها كلها.", locked: "هذه أداة من Pro.",
        monthly: "شهري", yearly: "سنوي", saveYr: "شهران مجانًا", perMo: "/ شهر", perYr: "/ سنة", billedYr: "{m} شهريًا، تُدفع سنويًا",
        feature: "الميزة", current: "خطتك الحالية", trial: "ابدأ تجربة مجانية 14 يومًا", trialOn: "بدأت تجربة Pro", fine: "لا حاجة لبطاقة في التجربة. ألغِ في أي وقت.",
        rows: [["الحاسبة ووضع العمل", "✓", "✓"], ["قوالب التركيز", "✓", "✓"], ["مكوّنات الخلطة", "3", "بلا حد"], ["التركيبات المحفوظة", "5", "بلا حد"], ["متتبع الراحة", "آخر 3 دفعات", "السجل كاملًا"], ["تذكير الجاهزية", "—", "✓"], ["تكلفة الزجاجة وسعر البيع", "—", "✓"], ["تصدير الملصق PNG", "—", "✓"], ["روابط المشاركة", "—", "✓"]],
      },
      blend: {
        mode: "نوع التركيبة", simple: "بسيطة", blend: "خلطة", ingredients: "المكوّنات", name: "المكوّن", namePh: "مثال: برغموت", share: "الحصة من المركّز", type: "النوع", price: "السعر للغرام",
        remove: "احذف المكوّن", up: "لأعلى", down: "لأسفل", add: "أضف مكوّنًا", balance: "وازن إلى 100%", total: "المجموع {n}%", off: "المجموع {n}% · تُحسب الحصص على 100%",
        concentrate: "المركّز", breakdown: "تفصيل المركّز", density: "كثافة الخلطة {d} غ/مل · من المكوّنات", limit: "الخلطة المجانية تتسع لـ 3 مكوّنات. Pro بلا حد.",
        types: { eo: "زيت عطري", aroma: "مادة عطرية", absolute: "مُطلق", fixative: "مثبّت", dpg: "DPG (مخفف)" },
      },
      tour: {
        take: "جولة سريعة", next: "التالي", back: "رجوع", skip: "تخطَّ الجولة", done: "إنهاء", count: "{n} / {m}", journal: "افتح اليوميات",
        steps: [
          ["زِن تركيبة", "اختر الحجم والتركيز. كيفيرا تتولى الوزن."],
          ["اخلط كصانع عطور", "العطور الحقيقية فيها أكثر من زيت. أضف كل مكوّن كحصة من المركّز."],
          ["اقرأها كميزان", "رقمان للميزان، بدقة 0.01 غ."],
          ["اسكب خطوة بخطوة", "ثم اسكب خطوة بخطوة: صفّر، ثم كل مكوّن، ثم الإيثانول."],
          ["سعّر كل زجاجة", "اعرف التكلفة وسعر البيع قبل أن تسكب."],
          ["دعه يرتاح، ثم بِعه", "كل دفعة تُسجَّل، واليوميات تتابعها وهي ترتاح. Pro يفتح كل ذلك."],
        ],
      },
      journal: {
        room: "اليوميات", title: "دعه يرتاح.", lead: "الدفعة تتغيّر في الزجاجة. دوّن تغيّرها.", back: "منضدة العمل", soon: "جاهز قريبًا", readyIn: "جاهز بعد {n} يومًا", ready: "جاهز",
        batches: "الدفعات", poured: "سُكبت {date}", readyOn: "جاهز {date}", remind: "ذكّرني عند الجاهزية", reminded: "التذكير مفعّل", note: "الملاحظة", notePh: "ماذا تشمّ الآن؟", rating: "التقييم", tags: "الوسوم",
        save: "احفظ الملاحظة", saved: "حُفظت الملاحظة", empty: "لا ملاحظة بعد.", future: "تُفتح {date}", compare: "قارن", compareOff: "أغلق المقارنة", a: "من", b: "إلى", compareNone: "أضف ملاحظتين لتقارن بينهما.",
        locked: "{n} دفعات أقدم", lockedBody: "Pro يحفظ سجل الراحة لكل دفعة.", remindPro: "التذكيرات أداة من Pro.", started: "سُجّلت برقم {no} · بدأ متتبع الراحة", meta: "{size} مل · {pct}% · {tier}", progress: "اليوم {n} من 90", newBadge: "جديد",
      },
    },
  };
  const fill = (s, v) => String(s).replace(/\{(\w+)\}/g, (_, k) => (v && v[k] != null ? v[k] : ""));
  const strings = (lang) => S[lang === "ar" ? "ar" : "en"];

  function addDays(iso, days) { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + days); return d; }
  function fmtDate(d, lang) { return d.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", { day: "numeric", month: "short", year: "numeric" }); }
  const TODAY = "2026-11-03";

  // Everything a bench screen shows, from its inputs. No arithmetic in the templates.
  function compute(s) {
    const lang = s.lang === "ar" ? "ar" : "en"; const t = strings(lang);
    const fam = FAMILIES[s.family] || FAMILIES.fresh;
    const dOil = s.measured && s.measured > 0 ? s.measured : fam.density;
    const d = { oil: dOil, ethanol: ETHANOL };
    const pct = Math.min(Math.max(Number(s.pct) || 0, 0), 99);
    const c = pct / 100;
    let exact, basis = "volume", bottles = null, leftover = null;
    if (s.mode === "oil") {
      const oilG = Math.max(Number(s.oilOnHand) || 0, 0);
      exact = c > 0 ? byVolume(oilG / d.oil / c, c, d) : byVolume(0, 0, d);
      const b = Number(s.bottleMl) || 0;
      if (b > 0) { bottles = Math.floor(Number((exact.totalMl / b).toPrecision(12))); leftover = exact.totalMl - bottles * b; }
    } else {
      const amt = Math.max(Number(s.amount) || 0, 0);
      if (s.unit === "g") { basis = "weight"; exact = byWeight(amt, c, d); } else exact = byVolume(amt, c, d);
    }
    const oilG = round2(exact.oilG), ethG = round2(exact.ethanolG), totG = round2(oilG + ethG);
    const other = (basis === "volume" ? v2w(c, d) : w2v(c, d)) * 100;
    const share = totG > 0 ? oilG / totG : 0;
    const inv = INVENTORY.find((i) => i.name.toLowerCase() === String(s.name || "").trim().toLowerCase());
    let stock = { state: "none", text: t.stockNone, max: null };
    if (inv) {
      const left = inv.g - oilG;
      const maxMl = c > 0 ? Math.floor(inv.g / d.oil / c) : 0;
      if (left < 0) stock = { state: "short", text: fill(t.stockShort, { have: fmt2(inv.g), need: fmt2(oilG) }), sub: fill(t.stockMax, { max: maxMl }), max: maxMl, useMax: fill(t.useMax, { max: maxMl }) };
      else if (left < inv.low) stock = { state: "low", text: fill(t.stockLow, { left: fmt2(left), name: inv.name, low: inv.low }), max: null };
      else stock = { state: "ok", text: fill(t.stockOk, { have: fmt2(inv.g), left: fmt2(left) }), max: null };
      stock.have = inv.g; stock.fraction = Math.min(1, oilG / inv.g); stock.left = Math.max(0, left);
    }
    const ready = addDays(TODAY, 90);
    const minPour = Math.min(oilG, ethG);
    const strength = tierFor(pct);
    return {
      t, lang, basis, pct, d, densityStr: d.oil.toFixed(2), measured: !!(s.measured > 0),
      oilG: fmt2(oilG), ethG: fmt2(ethG), totG: fmt2(totG), oilGn: oilG, ethGn: ethG, totGn: totG,
      oilMl: fmt2(exact.oilMl), ethMl: fmt2(exact.ethanolMl), totMl: fmt2(exact.totalMl), totMln: exact.totalMl,
      oilOz: fmt2(oilG / 28.3495), ethOz: fmt2(ethG / 28.3495), totOz: fmt2(totG / 28.3495),
      oilFloz: fmt2(exact.oilMl / 29.5735), ethFloz: fmt2(exact.ethanolMl / 29.5735), totFloz: fmt2(exact.totalMl / 29.5735),
      ratio: oilG > 0 ? `1 : ${fmt2(ethG / oilG)}` : "—", share, sharePct: (share * 100).toFixed(1) + "%",
      otherPct: fmt2(other), pctSentence: fill(basis === "volume" ? t.pctSentence : t.pctSentenceW, { v: pct, w: fmt2(other) }),
      densityLine: fill(t.density, { d: d.oil.toFixed(2) }) + " · " + (s.measured > 0 ? t.densityMeasured : t.densityFamily),
      precisionWarn: minPour > 0 && minPour < 1, restText: fill(t.rest, { date: fmtDate(ready, lang) }), readyDate: fmtDate(ready, lang),
      familyLabel: fam[lang], familySub: lang === "ar" ? fam.subAr : fam.subEn, familyColor: fam.color,
      strengthName: lang === "ar" ? strength.ar : strength.name, stock, inv,
      fills: bottles == null ? "" : bottles > 0 ? fill(t.fills, { n: bottles, size: s.bottleMl, left: fmt2(leftover) }) : fill(t.fillsNone, { size: s.bottleMl }),
      shareUrl: shareUrl(s),
    };
  }

  function shareUrl(s) {
    const q = new URLSearchParams();
    if (s.name) q.set("name", s.name);
    q.set("family", s.family || "fresh");
    if (s.mode === "oil") { q.set("oil", s.oilOnHand); } else { q.set("size", s.amount); q.set("unit", s.unit || "ml"); }
    q.set("conc", s.pct);
    if (s.measured > 0) q.set("density", Number(s.measured).toFixed(3));
    return `https://scent-handbook-app.vercel.app${s.lang === "ar" ? "/ar" : ""}/bench?${q.toString()}`;
  }

  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {
      try { const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove(); return true; } catch (_) { return false; }
    }
  }

  function recipeText(r, name) {
    return `${name || "Kyphira batch"} — ${r.familyLabel}, ${r.pct}% (${r.strengthName})\nFragrance oil: ${r.oilG} g / ${r.oilMl} mL\nEthanol 96%: ${r.ethG} g / ${r.ethMl} mL\nTotal: ${r.totG} g / ${r.totMl} mL\nDensities: oil ${r.densityStr} g/mL · ethanol 0.81 g/mL\n${r.shareUrl}`;
  }

  // The label as a PNG (the HTML tool's receipt export, ported). 1200 × 750, palette-aware.
  function drawLabel({ r, name, no, theme, lang }) {
    const p = PALETTES[theme] || PALETTES.light; const L = strings(lang).labelSheet; const rtl = lang === "ar";
    const W = 1200, H = 750; const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const x = cv.getContext("2d");
    const serif = rtl ? "'Reem Kufi', serif" : "'Instrument Serif', Georgia, serif"; const sans = rtl ? "'Readex Pro', sans-serif" : "'Instrument Sans', system-ui, sans-serif";
    x.fillStyle = p.card; x.fillRect(0, 0, W, H);
    x.strokeStyle = p.ink; x.lineWidth = 2; x.strokeRect(40, 40, W - 80, H - 80);
    x.strokeStyle = p.line; x.lineWidth = 1; x.strokeRect(54, 54, W - 108, H - 108);
    x.direction = rtl ? "rtl" : "ltr"; const sx = rtl ? W - 100 : 100, ex = rtl ? 100 : W - 100; const al = rtl ? "right" : "left", ar = rtl ? "left" : "right";
    x.fillStyle = p.actionText; x.font = `500 20px ${sans}`; x.textAlign = al; x.fillText((rtl ? "كيفيرا" : "KYPHIRA") + "  ·  " + L.batch + " No. " + String(no).padStart(3, "0"), sx, 120);
    x.fillStyle = p.ink; x.font = `400 92px ${serif}`; x.fillText(name || (rtl ? "دفعة بلا اسم" : "Untitled batch"), sx, 230);
    x.fillStyle = p.dim; x.font = `400 28px ${sans}`; x.fillText(`${r.familyLabel} · ${r.pct}% ${r.strengthName}`, sx, 285);
    x.fillStyle = p.line; x.fillRect(100, 330, W - 200, 1);
    const rows = [[L.oil, r.oilG, r.oilMl], [L.ethanol, r.ethG, r.ethMl], [L.total, r.totG, r.totMl]];
    rows.forEach((row, i) => {
      const y = 400 + i * 70; x.textAlign = al; x.fillStyle = p.inkSoft; x.font = `400 28px ${sans}`; x.fillText(row[0], sx, y);
      x.textAlign = ar; x.fillStyle = p.ink; x.font = `${i === 2 ? 600 : 400} 40px ${sans}`; x.direction = "ltr"; x.fillText(`${row[1]} g  ·  ${row[2]} mL`, ex, y); x.direction = rtl ? "rtl" : "ltr";
      if (i === 1) { x.fillStyle = p.ink; x.fillRect(100, y + 24, W - 200, 2); }
    });
    x.textAlign = al; x.fillStyle = p.verdigrisText; x.font = `italic 400 30px ${serif}`; x.fillText(`${L.rest} ${r.readyDate}`, sx, 640);
    x.textAlign = ar; x.fillStyle = p.ember; x.font = `500 24px ${sans}`; x.fillText("⚠ " + L.flammable, ex, 640);
    // oil band
    x.fillStyle = p.oil; x.fillRect(rtl ? W - 60 : 54, 54, 6, H - 108);
    return cv.toDataURL("image/png");
  }
  function download(dataUrl, filename) { const a = document.createElement("a"); a.href = dataUrl; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); }

  window.Kx = { TODAY, addDays, INGREDIENT_TYPES, INGREDIENT_KEYS, BLEND_SEED, blendMix, MILESTONES, TAGS, JOURNAL, tierFor, FORMULAS, PLAN, COST_DEFAULTS, costFor, money, PALETTES, vars, FAMILIES, FAMILY_KEYS, STRENGTHS, SIZES, INVENTORY, RECENT, ETHANOL, round2, fmt2, pourProgress, alcoholForOil, measuredDensity, strings, fill, compute, shareUrl, copy, recipeText, drawLabel, download, fmtDate };
  window.dispatchEvent(new Event("kx-ready"));
})();
