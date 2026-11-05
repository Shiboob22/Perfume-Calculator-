# Graph Report - Perfume-Calculator-  (2026-11-05)

## Corpus Check
- Large corpus: 1614 files · ~560,216 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 2556 nodes · 7821 edges · 124 communities (117 shown, 7 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 146 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Kyphira Logo & Brand Mark
- Recipe Page & Sitemap API
- UI Primitives & Router
- Perfume Search & Cards
- Logo Generation Script
- Atlas Room
- Calculator Helpers (Density, Oil History)
- Atlas & Blend-loop E2E
- Batch Edit
- Calculator Core Screen
- Package Dependencies
- Stepper & Confirm
- Batches Screen
- App Navigation
- Search Results List
- Selector Config
- Shop API
- Nose API
- AI (Gemini) API
- Function Budget & Migration Tests
- App Shell
- Check-ins & Inventory API
- Design Board Runtime (boards)
- Design Board Runtime (project)
- Design Board Runtime (design)
- App & Public E2E Specs
- Selector Scoring
- Calc Core & Oracle Tests
- Journal Logic
- CI Workflow
- Icons & Compounding Scene
- Glossary & Icons
- Weight Scale & Styleguide
- Dev Primitives & Motion Tokens
- Compounding Home Scene
- Site Footer, Guides & Legal
- ESLint & Dev Dependencies
- Preferences & i18n Provider
- Bench Mode
- Selector Choices
- Bottle Labels
- Blend Math (basis, blend, history)
- Calculator Modes
- Calculator Results
- Account API & Rate Limits
- Numbers Diff Script
- Batch Journal & Check-in Form
- Motion Environment
- Billing Webhook
- Dev Motion Page
- Selector Profiles
- Catalog Dedupe
- Arabic Fonts & Batch Card
- Naming Engine
- Deck Runtime A
- Deck Runtime B
- Deck Runtime C
- Prerender Script
- Account Screen
- Check-in Parsing
- Real-rooms Screenshot Script
- Bundle Loader A
- Bundle Loader B
- Bundle Loader C
- Bottle Fill & Segmented
- Import Guard Test
- A11y & Shop E2E
- Uptime Workflow
- Auth Gate
- Batches API
- Selector Explain
- Supabase Query Client
- Component Runtime A
- Component Runtime B
- Component Runtime C
- AI Handler Tests
- Fake DB Test Harness
- API tsconfig
- Feature Flags
- Batches API Tests
- Build Tooling & Motion Record
- NPM Scripts
- Calculator Payload Tests
- Bundle & Private-term Checks
- Empty State & Page Transition
- Account API Client
- Src tsconfig
- Error Boundary & Reporting
- Journal Due & Share Panel
- Perfumer Chat
- Guides Content
- Nose Tests
- Standalone Boot A
- Standalone Boot B
- Standalone Boot C
- Data Export
- Board-sync E2E
- Smooth Scroll (Lenis)
- Catalog Seed Script
- Screenshots Script
- Nose Prompts
- Shop Tests
- Selector E2E
- Vite Config
- Bench Cards
- Dev Screens & Entitlements
- Design Directions
- FPS Governor & Smoke
- Staging E2E Script
- Response Helpers
- Screen-reader E2E
- Routes
- Vercel Config
- Perf Pages Script
- i18n Message Tests
- Rename Notice
- Tailwind Config
- Entitlement Tests
- Bottle Ratio Bar
- Registry A
- Registry B
- Registry C

## God Nodes (most connected - your core abstractions)
1. `useI18n()` - 200 edges
2. `react` - 128 edges
3. `COLORS` - 104 edges
4. `vitest` - 73 edges
5. `Calculator()` - 66 edges
6. `Link` - 65 edges
7. `errorText()` - 52 edges
8. `Button()` - 47 edges
9. `App()` - 43 edges
10. `@playwright/test` - 42 edges

## Surprising Connections (you probably didn't know these)
- `StandaloneRoot()` --indirect_call--> `Root()`  [INFERRED]
  design/Scent handbook app project/support.js → src/Root.jsx
- `StandaloneRoot()` --indirect_call--> `Root()`  [INFERRED]
  design/boards/support.js → src/Root.jsx
- `StandaloneRoot()` --indirect_call--> `Root()`  [INFERRED]
  design/support.js → src/Root.jsx
- `flacon()` --indirect_call--> `KyphiraLogo()`  [INFERRED]
  scripts/make-og-images.mjs → src/components/kx/KyphiraLogo.jsx
- `handler()` --calls--> `can()`  [EXTRACTED]
  api/ai.ts → src/lib/entitlements.js

## Import Cycles
- None detected.

## Communities (124 total, 7 thin omitted)

### Community 0 - "Kyphira Logo & Brand Mark"
Cohesion: 0.06
Nodes (62): BrandMark(), FlaconMark(), [, , BOX_W, BOX_H], KyphiraLogo(), part(), SymbolParts(), LOCKUPS, SYMBOL (+54 more)

### Community 1 - "Recipe Page & Sitemap API"
Cohesion: 0.06
Nodes (66): handler(), RELEASE, shownWeights(), SITE, sitemap(), xmlEsc(), recipe, BRAND (+58 more)

### Community 2 - "UI Primitives & Router"
Cohesion: 0.08
Nodes (60): react-router-dom, BLANK, SIZES, VARIANTS, Field(), Compose(), publish(), ERROR_KEYS (+52 more)

### Community 3 - "Perfume Search & Cards"
Cohesion: 0.06
Nodes (70): AccordBar(), BottleArt(), BottlePhoto(), CardGrid(), CardSkeleton(), ClassificationRadar(), familyOf(), labelPos() (+62 more)

### Community 4 - "Logo Generation Script"
Cohesion: 0.07
Nodes (53): fav, FORMS, horiz, html, lockup(), parts, rdp(), round2() (+45 more)

### Community 5 - "Atlas Room"
Cohesion: 0.09
Nodes (49): Atlas(), Browse(), Contribute(), submit(), EntityPage(), FragrancePage(), Pyramid(), Review() (+41 more)

### Community 6 - "Calculator Helpers (Density, Oil History)"
Cohesion: 0.10
Nodes (29): react, inputStyle, Fallback(), JournalPatterns(), Notice(), TONES, DEFAULT_SIZE, SIZES (+21 more)

### Community 7 - "Atlas & Blend-loop E2E"
Cohesion: 0.09
Nodes (25): F1, F2, fakeApi(), BATCH, fakeApi(), fakeApi(), json(), signIn() (+17 more)

### Community 8 - "Batch Edit"
Cohesion: 0.11
Nodes (46): asText(), BatchEdit(), save(), start(), FIELDS, handleDelete(), handleInsights(), refresh() (+38 more)

### Community 9 - "Calculator Core Screen"
Cohesion: 0.08
Nodes (38): MeasuredDensity(), OilHistory(), Source(), addDays(), AmountWithUnit(), CALC_STRENGTHS, Calculator(), deductStock() (+30 more)

### Community 10 - "Package Dependencies"
Cohesion: 0.07
Nodes (42): dependencies, @fontsource/ibm-plex-mono@^5.3.0, @fontsource/ibm-plex-sans-arabic@^5.3.0, @fontsource/instrument-serif@^5.3.0, @fontsource/lora@^5.3.0, @fontsource/poppins@^5.3.0, @fontsource/tajawal@^5.3.0, @fontsource-variable/hanken-grotesk@^5.3.0 (+34 more)

### Community 11 - "Stepper & Confirm"
Cohesion: 0.12
Nodes (32): add(), Button(), Confirm(), Stepper(), BottleForm(), Collection(), remove(), save() (+24 more)

### Community 12 - "Batches Screen"
Cohesion: 0.13
Nodes (27): Batches(), BatchList(), BatchTiming(), RestPanel(), round2(), totalOf(), IconHourglass, IconToday (+19 more)

### Community 13 - "App Navigation"
Cohesion: 0.11
Nodes (33): AppNav(), BarButton, Dest(), destinations(), DueBadge(), MoreSheet(), PRIMARY(), site() (+25 more)

### Community 14 - "Search Results List"
Cohesion: 0.14
Nodes (26): ResultList(), ResultRow(), Card(), catalogueNumber(), Chip(), FragranceCard(), RoomBeam(), RoomHeader() (+18 more)

### Community 15 - "Selector Config"
Cohesion: 0.11
Nodes (31): ACCORD_FAMILY, ACCORD_SENSORY, AVOID_TRAITS, CONTEXT_KEYS, ContextKey, FAMILY_TEXT_ACCORD, MOOD_KEYS, NOTE_PATTERNS (+23 more)

### Community 16 - "Shop API"
Cohesion: 0.12
Nodes (28): anonClient(), ascii(), decodeProof(), egp(), esc(), ImageType, MAX_PROOF_BYTES, newOrderNo() (+20 more)

### Community 17 - "Nose API"
Cohesion: 0.09
Nodes (30): Answer, ANSWER_SCHEMA, Candidate, CANDIDATE_LIMIT, CLAIMS, cleanPrefs(), cleanQuestion(), DEFAULT_DAILY_CAP (+22 more)

### Community 18 - "AI (Gemini) API"
Cohesion: 0.14
Nodes (29): AiError, ALLOWED_ORIGINS, callGemini(), chat(), Content, describeBatches(), generate(), getUserId() (+21 more)

### Community 19 - "Function Budget & Migration Tests"
Cohesion: 0.07
Nodes (16): deployable(), AT, STAGES, STAGES, htmlPath, [out, cols, tw, ...files], card(), flacon() (+8 more)

### Community 20 - "App Shell"
Cohesion: 0.12
Nodes (29): Account, App(), Atlas, Batches, BenchCards, BenchMode, CountDueCheckIns(), FragranceBlendCalculator (+21 more)

### Community 21 - "Check-ins & Inventory API"
Cohesion: 0.19
Nodes (23): handler(), fail(), failFrom(), handler(), loadEntitlements(), lockedFeature(), ALLOWED_ORIGINS, isTimeout() (+15 more)

### Community 22 - "Design Board Runtime (boards)"
Cohesion: 0.10
Nodes (18): cdnScriptFor(), compileTemplate(), contentKey(), createPseudoSheet(), dcNameFromPath(), encodeCamelAttrs(), encodeCase(), findTopLevelEquality() (+10 more)

### Community 23 - "Design Board Runtime (project)"
Cohesion: 0.10
Nodes (18): cdnScriptFor(), compileTemplate(), contentKey(), createPseudoSheet(), dcNameFromPath(), encodeCamelAttrs(), encodeCase(), findTopLevelEquality() (+10 more)

### Community 24 - "Design Board Runtime (design)"
Cohesion: 0.10
Nodes (18): cdnScriptFor(), compileTemplate(), contentKey(), createPseudoSheet(), dcNameFromPath(), encodeCamelAttrs(), encodeCase(), findTopLevelEquality() (+10 more)

### Community 25 - "App & Public E2E Specs"
Cohesion: 0.08
Nodes (9): enabled, PAGES, WIDTHS, DESKTOP_ONLY_PAGES, PAGES, @playwright/test, out, runs (+1 more)

### Community 26 - "Selector Scoring"
Cohesion: 0.16
Nodes (25): SCORE_COMPONENTS, SELECTOR_WEIGHTS, heaviness(), affinity(), calculateClimateCompatibility(), calculateComponents(), calculateFamilyCompatibility(), calculateIntensityCompatibility() (+17 more)

### Community 27 - "Calc Core & Oracle Tests"
Cohesion: 0.15
Nodes (21): ReadoutRow(), volumeToWeightFraction(), H, calculate(), CalculatorInput, positive(), batchCost(), batchEconomics() (+13 more)

### Community 28 - "Journal Logic"
Cohesion: 0.12
Nodes (22): actualStrength(), CheckIn, CheckInPoint, checkInSchedule(), DueCheckIn, FamilyCheckIn, familyPatterns(), FOLLOW_UP_AFTER_REST (+14 more)

### Community 29 - "CI Workflow"
Cohesion: 0.09
Nodes (25): runs-on, steps, runs-on, steps, CI, VITE_SUPABASE_ANON_KEY, VITE_SUPABASE_URL, jobs (+17 more)

### Community 30 - "Icons & Compounding Scene"
Cohesion: 0.14
Nodes (19): IconArrow, IconBell, IconFlacon, IconNotebook, IconPlus, IconScaleDrop, IconSteps, IconTile() (+11 more)

### Community 31 - "Glossary & Icons"
Cohesion: 0.15
Nodes (20): IconBook, blockText(), ENTRIES, GLOSSARY_ENTRIES, glossaryTerm(), markTerms(), section(), fold() (+12 more)

### Community 32 - "Weight Scale & Styleguide"
Cohesion: 0.15
Nodes (18): ScaleReadout(), SmokeLine(), WeightScale(), DISPLAY, Pair(), PAIRS, Section(), Styleguide() (+10 more)

### Community 33 - "Dev Primitives & Motion Tokens"
Cohesion: 0.21
Nodes (21): DevPrimitives(), Sheet(), Spacer(), MOTION, CountUp(), cx(), DrawLine(), Pin() (+13 more)

### Community 34 - "Compounding Home Scene"
Cohesion: 0.14
Nodes (16): Compounding(), Figure(), RoomLink(), ROOMS, SCENE_VARS, Stage(), LazyCompounding(), Scene (+8 more)

### Community 35 - "Site Footer, Guides & Legal"
Cohesion: 0.18
Nodes (16): SiteFooter(), GUIDES, LEGAL, LEGAL_PAGES, CATALOGS, LOADERS, esc(), headFor() (+8 more)

### Community 36 - "ESLint & Dev Dependencies"
Cohesion: 0.09
Nodes (23): devDependencies, autoprefixer@^10.4.19, @axe-core/playwright@^4.13.0, eslint@^9.39.5, @eslint/js@^9.39.5, eslint-plugin-react-hooks@^5.2.0, globals@^15.15.0, @playwright/test@^1.63.0 (+15 more)

### Community 37 - "Preferences & i18n Provider"
Cohesion: 0.13
Nodes (18): Preferences(), preload(), render(), loadCatalog(), I18nProvider(), setLocale(), initialLocale(), beforeSend() (+10 more)

### Community 38 - "Bench Mode"
Cohesion: 0.17
Nodes (19): BenchMode(), handleLog(), Big(), Grams(), loadPlan(), loadProgress(), Rules(), RULES_AT (+11 more)

### Community 39 - "Selector Choices"
Cohesion: 0.16
Nodes (20): IconCheck, Choice(), Choices(), isAnswered(), KnownStep(), pick(), primary, quiet (+12 more)

### Community 40 - "Bottle Labels"
Cohesion: 0.20
Nodes (21): inputStyle, Labels(), labelWeights(), A4, bottleText(), clip(), compactLayout(), customSize() (+13 more)

### Community 41 - "Blend Math (basis, blend, history)"
Cohesion: 0.24
Nodes (17): concentrationOf(), displayed(), fromWeights(), BatchRow, checkPour(), PourCheck, adjustConcentration(), Adjustment (+9 more)

### Community 42 - "Calculator Modes"
Cohesion: 0.20
Nodes (19): economicsRows(), Adjust(), BasisToggle(), FromOil(), inputStyle, Num(), Row(), Run() (+11 more)

### Community 43 - "Calculator Results"
Cohesion: 0.17
Nodes (21): Alignment(), avg(), Bar(), Block(), Notice(), pct(), Results(), COLUMNS (+13 more)

### Community 44 - "Account API & Rate Limits"
Cohesion: 0.14
Nodes (13): handler(), timedFetch(), clientIp(), LimitName, LIMITS, overLimit(), fakeRes(), res (+5 more)

### Community 45 - "Numbers Diff Script"
Cohesion: 0.13
Nodes (18): CALCULATOR_PRESETS, named, notes, rows, Difference, differences(), ETHANOL_DENSITY, FAMILIES (+10 more)

### Community 46 - "Batch Journal & Check-in Form"
Cohesion: 0.23
Nodes (16): CheckInForm(), send(), inputStyle, saveCheckIn(), todayFor(), dismissRefused(), enqueue(), enqueueCheckIn() (+8 more)

### Community 47 - "Motion Environment"
Cohesion: 0.29
Nodes (16): lowPower(), motionOn(), reduced(), root(), syncEnv(), initMotion(), cx(), Light() (+8 more)

### Community 48 - "Billing Webhook"
Cohesion: 0.15
Nodes (14): config, handler(), rawBody(), applyEvent(), BillingEvent, BillingProvider, CurrentPlan, getProvider() (+6 more)

### Community 49 - "Dev Motion Page"
Cohesion: 0.24
Nodes (15): clamp(), DevMotion(), forceMotion(), Switch(), MOTION_SCENE, SCALE, stageAt(), STAGES (+7 more)

### Community 50 - "Selector Profiles"
Cohesion: 0.18
Nodes (19): AvoidTrait, ContextProfile, FamilyProfile, MoodProfile, SensoryProfile, FragranceProfile, isAvoidTrait(), Acc (+11 more)

### Community 51 - "Catalog Dedupe"
Cohesion: 0.19
Nodes (14): dedupeVariants(), key(), Row, d(), classifyTier(), TIER_RULES, fetchParfumoData(), getUserId() (+6 more)

### Community 52 - "Arabic Fonts & Batch Card"
Cohesion: 0.22
Nodes (14): loadArabicFonts(), dirOf(), arabicFontsReady(), cardRows(), downloadBatchCard(), isolate(), ltr(), renderBatchCard() (+6 more)

### Community 53 - "Naming Engine"
Cohesion: 0.15
Nodes (17): FamilyKey, MoodKey, SensoryKey, Identity, SignatureWord, CLIMATE_LEVEL, Effect, fam() (+9 more)

### Community 54 - "Deck Runtime A"
Cohesion: 0.25
Nodes (18): collectProps(), compileAttr(), cssToObj(), getReact(), hostPositionStyle(), isDeckMountTag(), kebabToCamel(), renderDeckKids() (+10 more)

### Community 55 - "Deck Runtime B"
Cohesion: 0.25
Nodes (18): collectProps(), compileAttr(), cssToObj(), getReact(), hostPositionStyle(), isDeckMountTag(), kebabToCamel(), renderDeckKids() (+10 more)

### Community 56 - "Deck Runtime C"
Cohesion: 0.25
Nodes (18): collectProps(), compileAttr(), cssToObj(), getReact(), hostPositionStyle(), isDeckMountTag(), kebabToCamel(), renderDeckKids() (+10 more)

### Community 57 - "Prerender Script"
Cohesion: 0.11
Nodes (15): arabicCss, arabicCssFiles, arabicHead, arabicOptional, assets, CRITICAL_FONTS, css, entries (+7 more)

### Community 58 - "Account Screen"
Cohesion: 0.21
Nodes (17): Account(), buttonStyle, DeleteAccount(), remove(), download(), ExportData(), inputStyle, Section() (+9 more)

### Community 59 - "Check-in Parsing"
Cohesion: 0.23
Nodes (11): CheckInRow, isDay(), parseCheckIn(), base, FAMILIES, ShareRow, shareRow(), batch (+3 more)

### Community 60 - "Real-rooms Screenshot Script"
Cohesion: 0.13
Nodes (14): atlasRow(), bottles, errors, fake(), json(), picks, posts, QUERIES (+6 more)

### Community 61 - "Bundle Loader A"
Cohesion: 0.17
Nodes (14): bundledBlob(), createExternalModules(), ensureBabel(), load(), resolveGlobal(), waitForGlobal(), createHelmetManager(), applyCanvasBg() (+6 more)

### Community 62 - "Bundle Loader B"
Cohesion: 0.17
Nodes (14): bundledBlob(), createExternalModules(), ensureBabel(), load(), resolveGlobal(), waitForGlobal(), createHelmetManager(), applyCanvasBg() (+6 more)

### Community 63 - "Bundle Loader C"
Cohesion: 0.17
Nodes (14): bundledBlob(), createExternalModules(), ensureBabel(), load(), resolveGlobal(), waitForGlobal(), createHelmetManager(), applyCanvasBg() (+6 more)

### Community 64 - "Bottle Fill & Segmented"
Cohesion: 0.27
Nodes (13): BottleFill(), Segmented(), IconBalance, IconFlameTriangle, STRENGTHS, OFFSET_SHADOW, BENCH_DEFAULT, BENCH_SIZES (+5 more)

### Community 65 - "Import Guard Test"
Cohesion: 0.15
Nodes (10): reachable(), relativeImports(), target(), tsFiles(), CONFIG, file(), PORT, REDIRECTS (+2 more)

### Community 66 - "A11y & Shop E2E"
Cohesion: 0.15
Nodes (7): PAGES, PNG, PRODUCTS, bottle(), fakeApi(), idFor(), @axe-core/playwright

### Community 67 - "Uptime Workflow"
Cohesion: 0.13
Nodes (14): env, runs-on, steps, timeout-minutes, SITE, jobs, check, name (+6 more)

### Community 68 - "Auth Gate"
Cohesion: 0.26
Nodes (11): AuthGate(), storedSession(), LanguageToggle(), WorkedExample(), signInWithEmail(), signInWithProvider(), auth, AUTH_STORAGE_KEY (+3 more)

### Community 69 - "Batches API"
Cohesion: 0.27
Nodes (13): batchRecord(), batchRow(), deductOnLog(), editRow(), fail(), failFrom(), handler(), recipeLink() (+5 more)

### Community 70 - "Selector Explain"
Cohesion: 0.27
Nodes (12): FAMILY_KEYS, SCORING, SENSORY_KEYS, Caution, explain(), Reason, ReasonKey, Match (+4 more)

### Community 72 - "Component Runtime A"
Cohesion: 0.24
Nodes (11): createComponentFactory(), getDC(), createRuntime(), adoptParsed(), dcUpdate(), ensureFetched(), setStreaming(), updateHtml() (+3 more)

### Community 73 - "Component Runtime B"
Cohesion: 0.24
Nodes (11): createComponentFactory(), getDC(), createRuntime(), adoptParsed(), dcUpdate(), ensureFetched(), setStreaming(), updateHtml() (+3 more)

### Community 74 - "Component Runtime C"
Cohesion: 0.24
Nodes (11): createComponentFactory(), getDC(), createRuntime(), adoptParsed(), dcUpdate(), ensureFetched(), setStreaming(), updateHtml() (+3 more)

### Community 75 - "AI Handler Tests"
Cohesion: 0.27
Nodes (9): ask(), fetchMock, load(), state, call(), fakeReq(), fakeRes(), call() (+1 more)

### Community 77 - "API tsconfig"
Cohesion: 0.17
Nodes (11): compilerOptions, esModuleInterop, module, moduleResolution, noEmit, noImplicitAny, skipLibCheck, strict (+3 more)

### Community 78 - "Feature Flags"
Cohesion: 0.27
Nodes (5): applyFlagLink(), flagOn(), FLAGS, key(), useCompounding()

### Community 79 - "Batches API Tests"
Cohesion: 0.24
Nodes (9): BATCH, dbFor(), Failure, FREE_PLAN, Op, OTHER, PRO_PLAN, Row (+1 more)

### Community 80 - "Build Tooling & Motion Record"
Cohesion: 0.18
Nodes (8): workbox-build@^7.4.1, workbox-build, errors, [outdir, base = "http://localhost:5199", widths = "1440,375", only], PAGES, errors, [outdir, base, list, theme = "light", widths = "375,1440"], w()

### Community 81 - "NPM Scripts"
Cohesion: 0.18
Nodes (11): scripts, build, check:bundle, dev, e2e, lint, numbers:diff, preview (+3 more)

### Community 82 - "Calculator Payload Tests"
Cohesion: 0.24
Nodes (7): vitest, base, densities, target, base, planned, round2()

### Community 83 - "Bundle & Private-term Checks"
Cohesion: 0.20
Nodes (9): files, FORBIDDEN, problems, walkAll(), PRIVATE_NAMES, PRIVATE_PHRASES, PRIVATE_SCORE, PRIVATE_TERMS (+1 more)

### Community 84 - "Empty State & Page Transition"
Cohesion: 0.25
Nodes (9): EmptyState(), PageTransition(), useNavigate(), supportsViewTransitions(), canTransition(), isPlainClick(), navCommitted(), startNav() (+1 more)

### Community 85 - "Account API Client"
Cohesion: 0.27
Nodes (9): fetchAll(), fetchExport(), getProfile(), MINE, ORDER, saveProfile(), SELECT, ProfileContext (+1 more)

### Community 86 - "Src tsconfig"
Cohesion: 0.18
Nodes (10): compilerOptions, allowImportingTsExtensions, module, moduleResolution, noEmit, skipLibCheck, strict, target (+2 more)

### Community 87 - "Error Boundary & Reporting"
Cohesion: 0.27
Nodes (5): ErrorBoundary, errorPayload(), installGlobalHandlers(), reportError(), seen

### Community 88 - "Journal Due & Share Panel"
Cohesion: 0.36
Nodes (8): BatchJournal(), JournalDue(), SharePanel(), ago(), DevJournal(), fixture(), iso(), ymd()

### Community 89 - "Perfumer Chat"
Cohesion: 0.33
Nodes (9): ask(), PerfumerChat(), handleKeyDown(), send(), askNose(), askPerfumer(), batchInsights(), blendTips() (+1 more)

### Community 90 - "Guides Content"
Cohesion: 0.24
Nodes (6): AR_STRENGTH, BLENDING, QUICK_REFERENCE, SECTIONS, WEARING_1, WEARING_2

### Community 91 - "Nose Tests"
Cohesion: 0.25
Nodes (6): ask(), fetchMock, load(), PREFS, ROWS, state

### Community 92 - "Standalone Boot A"
Cohesion: 0.29
Nodes (8): boot(), StandaloneRoot(), createStreamTracker(), getReactDOM(), init(), parseDataProps(), parseDcDocument(), parseDcText()

### Community 93 - "Standalone Boot B"
Cohesion: 0.29
Nodes (8): boot(), StandaloneRoot(), createStreamTracker(), getReactDOM(), init(), parseDataProps(), parseDcDocument(), parseDcText()

### Community 94 - "Standalone Boot C"
Cohesion: 0.29
Nodes (8): boot(), StandaloneRoot(), createStreamTracker(), getReactDOM(), init(), parseDataProps(), parseDcDocument(), parseDcText()

### Community 95 - "Data Export"
Cohesion: 0.46
Nodes (6): RFC-4180, cell(), EXPORT_TABLES, strip(), toCsv(), toJson()

### Community 96 - "Board-sync E2E"
Cohesion: 0.32
Nodes (6): bottle(), dateOnly(), fakeApp(), idFor(), resting(), VIEWS

### Community 97 - "Smooth Scroll (Lenis)"
Cohesion: 0.46
Nodes (4): clearLeakedClasses(), smoothAllowed(), startSmoothScroll(), useSmoothScroll()

### Community 98 - "Catalog Seed Script"
Cohesion: 0.25
Nodes (4): { createClient }, fs, path, supabase

### Community 99 - "Screenshots Script"
Cohesion: 0.32
Nodes (7): APP, batches(), localDate(), PROFILE, PUBLIC, signedIn(), USER

### Community 100 - "Nose Prompts"
Cohesion: 0.29
Nodes (7): accordVocabulary(), nose(), ownedShelf(), answerPrompt(), answerSystem(), prefsSchema(), prefsSystem()

### Community 101 - "Shop Tests"
Cohesion: 0.29
Nodes (5): CUSTOMER, jpeg, PRODUCTS, sent, uploads

### Community 102 - "Selector E2E"
Cohesion: 0.33
Nodes (4): answerQuiz(), CATALOG, fakeApi(), pickOption()

### Community 103 - "Vite Config"
Cohesion: 0.29
Nodes (4): vite@^5.3.1, @vitejs/plugin-react@^4.3.1, vite, @vitejs/plugin-react

### Community 104 - "Bench Cards"
Cohesion: 0.48
Nodes (6): BenchCards(), Card(), CARDS, ProLocked(), guideBySlug(), useEntitlements()

### Community 105 - "Dev Screens & Entitlements"
Cohesion: 0.38
Nodes (5): DEV_USER, DevScreens(), SCREENS, EntitlementsContext, StaticEntitlements()

### Community 106 - "Design Directions"
Cohesion: 0.43
Nodes (6): BenchMock(), Board(), DIGITS, Directions(), FIG, Roll()

### Community 107 - "FPS Governor & Smoke"
Cohesion: 0.62
Nodes (4): createGovernor(), particlesAt(), Smoke(), smooth()

### Community 108 - "Staging E2E Script"
Cohesion: 0.43
Nodes (6): assert(), runTests(), signIn(), signUp(), TEST_USER_A, TEST_USER_B

### Community 110 - "Screen-reader E2E"
Cohesion: 0.40
Nodes (3): fakeApi(), openCalculator(), PAGES

### Community 111 - "Routes"
Cohesion: 0.53
Nodes (4): APP_PREFIXES, REDIRECTS, tabFromPath(), tabPath()

### Community 112 - "Vercel Config"
Cohesion: 0.33
Nodes (5): headers, redirects, regions, rewrites, $schema

### Community 113 - "Perf Pages Script"
Cohesion: 0.40
Nodes (3): out, paths, runs

### Community 114 - "i18n Message Tests"
Cohesion: 0.50
Nodes (3): isPlural(), keys(), PLURAL

### Community 116 - "Tailwind Config"
Cohesion: 0.40
Nodes (3): ARABIC_SYSTEM, dark, light

### Community 118 - "Bottle Ratio Bar"
Cohesion: 0.83
Nodes (3): RatioBar(), weightRatio(), weightShare()

### Community 119 - "Registry A"
Cohesion: 1.00
Nodes (3): createRegistry(), bump(), get()

### Community 120 - "Registry B"
Cohesion: 1.00
Nodes (3): createRegistry(), bump(), get()

### Community 121 - "Registry C"
Cohesion: 1.00
Nodes (3): createRegistry(), bump(), get()

## Knowledge Gaps
- **1 isolated node(s):** `RFC-4180`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 615 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Root()` connect `Preferences & i18n Provider` to `Site Footer, Guides & Legal`, `Standalone Boot A`, `Standalone Boot B`, `Standalone Boot C`?**
  _High betweenness centrality (0.191) - this node is a cross-community bridge._
- **What connects `RFC-4180` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `Kyphira Logo & Brand Mark` be split into smaller, more focused modules?**
  _Cohesion score 0.05759623861298854 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `Calculator Payload Tests` to `Kyphira Logo & Brand Mark`, `Recipe Page & Sitemap API`, `UI Primitives & Router`, `Perfume Search & Cards`, `Logo Generation Script`, `Atlas Room`, `Atlas & Blend-loop E2E`, `Calculator Core Screen`, `Package Dependencies`, `Batches Screen`, `App Navigation`, `Search Results List`, `Selector Config`, `Shop API`, `Nose API`, `Function Budget & Migration Tests`, `Check-ins & Inventory API`, `App & Public E2E Specs`, `Selector Scoring`, `Calc Core & Oracle Tests`, `Journal Logic`, `Icons & Compounding Scene`, `Glossary & Icons`, `Weight Scale & Styleguide`, `Dev Primitives & Motion Tokens`, `Site Footer, Guides & Legal`, `ESLint & Dev Dependencies`, `Selector Choices`, `Bottle Labels`, `Calculator Modes`, `Account API & Rate Limits`, `Numbers Diff Script`, `Batch Journal & Check-in Form`, `Billing Webhook`, `Dev Motion Page`, `Catalog Dedupe`, `Arabic Fonts & Batch Card`, `Check-in Parsing`, `Bottle Fill & Segmented`, `Import Guard Test`, `AI Handler Tests`, `Feature Flags`, `Batches API Tests`, `Error Boundary & Reporting`, `Nose Tests`, `Data Export`, `Smooth Scroll (Lenis)`, `Shop Tests`, `FPS Governor & Smoke`, `Routes`, `i18n Message Tests`, `Rename Notice`, `Entitlement Tests`?**
  _High betweenness centrality (0.181) - this node is a cross-community bridge._
- **Should `Recipe Page & Sitemap API` be split into smaller, more focused modules?**
  _Cohesion score 0.0558641975308642 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Calculator Helpers (Density, Oil History)` to `Kyphira Logo & Brand Mark`, `Recipe Page & Sitemap API`, `UI Primitives & Router`, `Perfume Search & Cards`, `Logo Generation Script`, `Atlas Room`, `Batch Edit`, `Calculator Core Screen`, `Package Dependencies`, `Stepper & Confirm`, `Batches Screen`, `App Navigation`, `Search Results List`, `Function Budget & Migration Tests`, `App Shell`, `Icons & Compounding Scene`, `Glossary & Icons`, `Weight Scale & Styleguide`, `Dev Primitives & Motion Tokens`, `Compounding Home Scene`, `Site Footer, Guides & Legal`, `Preferences & i18n Provider`, `Bench Mode`, `Selector Choices`, `Bottle Labels`, `Calculator Modes`, `Calculator Results`, `Batch Journal & Check-in Form`, `Motion Environment`, `Dev Motion Page`, `Account Screen`, `Bottle Fill & Segmented`, `Auth Gate`, `Feature Flags`, `Empty State & Page Transition`, `Account API Client`, `Journal Due & Share Panel`, `Smooth Scroll (Lenis)`, `Bench Cards`, `Dev Screens & Entitlements`, `Design Directions`, `FPS Governor & Smoke`, `Bottle Ratio Bar`?**
  _High betweenness centrality (0.142) - this node is a cross-community bridge._
- **Should `UI Primitives & Router` be split into smaller, more focused modules?**
  _Cohesion score 0.07879746835443038 - nodes in this community are weakly interconnected._