# Birthplace Simulator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a local, weighted birthplace simulator using 2023 UN WPP birth estimates, flag SVGs, translated UI, and accessible result animation.

**Architecture:** Keep all sampling, validation, and number formatting in a pure `src/lib/tools/birthplace-simulator.ts` module. Store the versioned 2023 dataset in `public/data/birthplace-simulator.json`; the page loads it once, then uses the pure distribution functions. Integrate one page through the existing route/config/i18n patterns and local `flag-icons` assets.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Tailwind CSS, react-i18next, lucide-react, `flag-icons` SVG assets.

## Global Constraints

- Use annual birth counts for weights; crude birth rate is display-only.
- Use 2023 historical estimates from UN World Population Prospects 2024.
- No sharing, links, copy result, login, history, live API, custom year, region filter, map, or 3D globe.
- All UI strings go through `useTranslation` with `ns: 'tools'` in all 9 locales.
- Keep computation pure and test it alongside source; do not add component tests.
- Preserve existing uncommitted coordinate-tool changes; stage only birthplace files per commit.
- Use local flag SVGs keyed by ISO 3166-1 alpha-2 codes.

---

### Task 1: Add the versioned birth dataset

**Files:**
- Create: `public/data/birthplace-simulator.json`
- Create: `scripts/prepare-birthplace-data.ts` only if needed to reproducibly transform the downloaded source; remove one-off generated files only after the dataset contains source metadata.

**Interfaces:**
- Produces a JSON payload with `{ year: 2023, source, countries }`.
- Each country has `code`, `name`, `region`, `births`, `birthRate`, `year`, `source`, and `flagCode`.

- [ ] Download the OWID CSV derived from `UN, World Population Prospects (2024)` at `https://ourworldindata.org/grapher/number-of-births-per-year.csv`; retain only year 2023 and rows with real countries, excluding aggregate entities whose code starts with `OWID_` or has no ISO country mapping.
- [ ] Download World Bank `SP.DYN.CBRT.IN` for 2023 and join only matching ISO entities for the auxiliary `birthRate` value.
- [ ] Join ISO alpha-3 to ISO alpha-2 using the standard country-code table; fail the transformation for an unmatched real country instead of emitting a broken flag.
- [ ] Include source metadata in the JSON: UN WPP 2024 citation, OWID processing note, World Bank indicator URL, year, unit conversion, and generated date.
- [ ] Verify no duplicate alpha-2 codes, all births are finite and positive, and the total is positive.
- [ ] Commit only the dataset and any reproducible source script with `data(birthplace): add 2023 birth distribution`.

### Task 2: Implement pure distribution logic with tests

**Files:**
- Create: `src/lib/tools/birthplace-simulator.ts`
- Create: `src/lib/tools/birthplace-simulator.test.ts`

**Interfaces:**
```ts
export interface BirthCountry {
  code: string
  name: string
  region: string
  births: number
  birthRate?: number
  year: number
  source: string
  flagCode: string
}

export interface BirthDataset {
  year: number
  source: string
  countries: BirthCountry[]
}

export interface PreparedBirthCountry extends BirthCountry {
  cumulativeBirths: number
  probability: number
}

export interface BirthDistribution {
  year: number
  source: string
  countries: PreparedBirthCountry[]
  totalBirths: number
}

export function prepareBirthDistribution(dataset: BirthDataset): BirthDistribution
export function pickBirthCountry(distribution: BirthDistribution, random?: () => number): PreparedBirthCountry
export function formatBirthCount(value: number, locale: string): string
export function formatBirthProbability(value: number, locale: string): string
export function formatBirthOdds(probability: number, locale: string): string
```

- [ ] Write failing tests for one-country selection, exact 0 boundary, near-1 boundary, weighted 9:1 boundaries, invalid empty/duplicate/non-positive/non-finite data, and number/odds formatting.
- [ ] Run `pnpm vitest run src/lib/tools/birthplace-simulator.test.ts`; confirm the new tests fail because the module is absent.
- [ ] Implement validation, cumulative weights, `[0,total)` selection, and `Intl.NumberFormat` formatting with no React dependencies.
- [ ] Run the focused test again; confirm it passes.
- [ ] Commit source and test as `feat(birthplace): add weighted birth distribution`.

### Task 3: Add local flag assets and page UI

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml`
- Create: `src/pages/BirthplaceSimulatorPage.tsx`
- Modify: `src/index.css` only if the existing theme needs one small scoped background utility; prefer page-local Tailwind classes.

**Interfaces:**
- Page loads `/data/birthplace-simulator.json` once and passes the parsed dataset to `prepareBirthDistribution`.
- Page renders the initial state, loading state, result state, and error state.

- [ ] Add the existing maintained `flag-icons` package, import its CSS once in the page or global stylesheet, and render `<span className={\`fi fi-${flagCode}\`}>` with localized `aria-label`; do not use a runtime CDN.
- [ ] Build a centered dark cosmic hero using existing layout primitives and named button sizes; keep the result card readable and avoid a complex map or 3D scene.
- [ ] Implement the state machine: `idle → drawing → result`, plus `error`; disable the main button while drawing and reset through “再投一次”.
- [ ] Use a short timer sequence for the country-name reveal, clear timers on unmount, and skip visual delay when `prefers-reduced-motion` is active.
- [ ] Put the status in `role="status"`, the result heading/content in `aria-live="polite"`, and errors in the existing alert primitive.
- [ ] Include only “start”, “retry”, and “data details” actions; do not add share or copy controls.
- [ ] Commit the page and dependency as `feat(birthplace): add simulator interface`.

### Task 4: Register route, tool, and translations

**Files:**
- Modify: `src/lib/routes.ts`
- Modify: `src/lib/tools-config.ts`
- Modify: `src/AppRoutes.tsx`
- Modify: `src/i18n/locales/en/tools.json`
- Modify: `src/i18n/locales/zh/tools.json`
- Modify: `src/i18n/locales/ja/tools.json`
- Modify: `src/i18n/locales/fr/tools.json`
- Modify: `src/i18n/locales/ko/tools.json`
- Modify: `src/i18n/locales/de/tools.json`
- Modify: `src/i18n/locales/es/tools.json`
- Modify: `src/i18n/locales/pt/tools.json`
- Modify: `src/i18n/locales/ru/tools.json`

**Interfaces:**
- Tool id: `birthplace-simulator`.
- Route: `/fun/birthplace-simulator`.
- Category: existing `Fun`; add it to `CATEGORIES` only if the current category list omits `Fun`.
- Icon: existing `Baby` from lucide-react.

- [ ] Add the route constant, tool config entry, direct route, and page import following current non-lazy small-page patterns.
- [ ] Add the complete `birthSimulator` namespace in English, including title, description, start, retry, result label, region, probability, count, rate, odds, year, source, method, loading, error, details, reduced-motion text, and data disclaimer.
- [ ] Add equivalent keys to the other eight locale files; preserve valid JSON and do not hardcode UI strings in the page.
- [ ] Commit integration as `feat(birthplace): register simulator and translations`.

### Task 5: Verify behavior and polish

**Files:**
- Modify only affected birthplace files if verification exposes a real defect.

- [ ] Run `pnpm vitest run src/lib/tools/birthplace-simulator.test.ts` and confirm the pure logic suite passes.
- [ ] Run `pnpm test:run`, `pnpm build`, and `pnpm lint`; fix only errors caused by this feature.
- [ ] Start the actual app and manually verify `/fun/birthplace-simulator` in light/dark mode, narrow viewport, keyboard operation, reduced motion, repeated draws, data details, and flag fallback.
- [ ] Confirm all 9 locale files contain the same required translation keys.
- [ ] Review `git diff` and `git status`; ensure pre-existing coordinate-tool changes are not staged.
- [ ] Commit only verification-driven fixes as `fix(birthplace): polish simulator verification issues` when needed.
