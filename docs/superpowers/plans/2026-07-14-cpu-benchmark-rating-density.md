# CPU Benchmark Rating and Density Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a version-scoped score rating and make the benchmark page match the project's compact tool UI.

**Architecture:** Keep score classification in the pure benchmark module and render its result through localized labels in the existing result panel. Restrict visual changes to Tailwind classes in the benchmark page, preserving the Worker and WASM paths.

**Tech Stack:** TypeScript, React, Vitest, i18next, Tailwind CSS, shadcn/ui

## Global Constraints

- Ratings apply only to `CPU-WASM v1 Baseline`.
- Do not add percentile, leaderboard, CPU model comparison, or stored history.
- Preserve all existing routes and benchmark state transitions.
- Add every visible string to all nine locale files.

---

### Task 1: Add the score rating model

**Files:**
- Modify: `src/lib/tools/cpu-benchmark.ts`
- Test: `src/lib/tools/cpu-benchmark.test.ts`

**Interfaces:**
- Produces: `type BenchmarkRating = 'basic' | 'good' | 'excellent' | 'exceptional'`
- Produces: `getBenchmarkRating(score: number): BenchmarkRating`

- [ ] **Step 1: Write the failing boundary test**

```ts
expect(getBenchmarkRating(249_999)).toBe('basic')
expect(getBenchmarkRating(250_000)).toBe('good')
expect(getBenchmarkRating(399_999)).toBe('good')
expect(getBenchmarkRating(400_000)).toBe('excellent')
expect(getBenchmarkRating(599_999)).toBe('excellent')
expect(getBenchmarkRating(600_000)).toBe('exceptional')
```

- [ ] **Step 2: Run the focused test and confirm it fails because the export is missing**

Run: `pnpm exec vitest run src/lib/tools/cpu-benchmark.test.ts`

- [ ] **Step 3: Implement the centralized thresholds**

```ts
export function getBenchmarkRating(score: number): BenchmarkRating {
  if (score < 250_000) return 'basic'
  if (score < 400_000) return 'good'
  if (score < 600_000) return 'excellent'
  return 'exceptional'
}
```

- [ ] **Step 4: Re-run the focused test and confirm it passes**

Run: `pnpm exec vitest run src/lib/tools/cpu-benchmark.test.ts`

### Task 2: Render the rating and reduce visual scale

**Files:**
- Modify: `src/pages/CpuBenchmarkPage.tsx`
- Modify: `src/i18n/locales/{en,zh,ja,fr,ko,de,es,pt,ru}/tools.json`

**Interfaces:**
- Consumes: `getBenchmarkRating(result.score)`

- [ ] **Step 1: Add translated rating labels and the version-scope note to all locales**
- [ ] **Step 2: Place the rating beside the final score using the existing Badge component**
- [ ] **Step 3: Replace large button, padding, gap, score, preparation, metric, and chart classes with the established compact equivalents**
- [ ] **Step 4: Run locale key parity and scoped ESLint checks**

Run: `pnpm exec eslint src/pages/CpuBenchmarkPage.tsx src/lib/tools/cpu-benchmark.ts src/lib/tools/cpu-benchmark.test.ts`

### Task 3: Verify and commit

**Files:**
- Verify all files in the CPU benchmark change set

- [ ] **Step 1: Run all tests**

Run: `pnpm test:run`
Expected: all tests pass.

- [ ] **Step 2: Run the production build**

Run: `pnpm build`
Expected: type checking, Vite bundling, and prerendering succeed.

- [ ] **Step 3: Perform desktop/mobile and light/dark browser checks**
- [ ] **Step 4: Stage only CPU benchmark-related files and commit with a Conventional Commit message**

```bash
git commit -m "feat(performance): add browser CPU benchmark"
```
