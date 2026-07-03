# China User Environment Detector Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a pure frontend browser environment detector that helps users understand whether their browser, device, and optional network signals resemble a China or mainland China environment.

**Architecture:** Reimplement the useful ideas from `yArna/isChinaUser` without copying source or adding the package, because the upstream repository currently has no declared GitHub license. Keep deterministic signal evaluation in `src/lib/tools/china-user-detector.ts`, keep browser-only probes behind safe guards, and make the React page a thin state and presentation layer.

**Tech Stack:** React, TypeScript, Vite, Vitest, shadcn/ui primitives already in the repo, Tailwind utilities, lucide-react icons already in the repo, Canvas APIs, `navigator`, `Intl.DateTimeFormat`, and optional `Image()` network probes.

---

## Context

The reference project is `yArna/isChinaUser`: https://github.com/yArna/isChinaUser

Its useful product idea is multi-signal browser-side detection:

- Language from `navigator.language` and `navigator.languages`
- Time zone from `Intl.DateTimeFormat().resolvedOptions().timeZone`, with UTC+8 fallback
- Emoji rendering differences via Canvas
- Common Chinese font availability via Canvas text measurement
- Optional network reachability probes through image loading

Do not import or copy the package. GitHub API reports `license: null`, and `https://raw.githubusercontent.com/yArna/isChinaUser/main/LICENSE` returns 404. Treat it as inspiration only.

## Product Positioning

Name: **China Environment Detector**

Route: `/security/china-user-detector`

Category: `Security`

Purpose: explain browser environment signals, not identify a person's nationality, ethnicity, legal residence, or exact location.

Recommended UI copy principle: always say "environment signals", "browser settings", "device signals", or "network exit", never "you are Chinese" or "user is Chinese".

## Design Read

Reading this as: a developer/debugging utility for site owners and technical users, with a quiet diagnostic interface, leaning toward the existing shadcn/Tailwind app system.

Dial values:

- `DESIGN_VARIANCE: 4` - mostly predictable layout, with enough hierarchy to separate summary, signal details, and network probe controls.
- `MOTION_INTENSITY: 2` - static tool UI with hover, focus, active, loading, and result state changes only.
- `VISUAL_DENSITY: 7` - more like a diagnostic console than a landing page, but not a cramped dashboard.

Taste constraints to follow:

- No marketing hero. Use the existing `ToolLayout` header.
- No decorative gradients, blobs, fake screenshots, or stock visuals.
- No three equal marketing feature cards. Use diagnostic rows and compact grouped panels.
- Keep a single shape system: current project style uses `rounded-md` and occasional `rounded-lg`; keep panels at 6-8px radius.
- Keep one accent family for status: green for positive, amber for uncertain, red/destructive only for real errors, muted for unavailable.
- Use lucide-react because this project already uses it. Do not introduce another icon set.
- Labels go above controls. Never use placeholder as label.
- Every interactive control needs keyboard focus, accessible labels, disabled states, and non-color-only status text.
- Dark mode must work through existing tokens: `bg-card`, `border-border`, `text-muted-foreground`, `bg-muted/50`, `text-foreground`.
- No em dashes in visible copy.

## UX Structure

The page should render immediately with local browser signals, then let the user explicitly run the network probe.

Top summary band:

- Result label:
  - `Likely mainland China environment`
  - `Likely Greater China environment`
  - `Some China-related signals`
  - `No strong China-related signals`
  - `Unable to judge`
- Confidence:
  - `high`, `medium`, `low`, `unknown`
- Score:
  - Show as `{{score}} / {{maxScore}}`, not a progress bar.
  - Avoid fake precision and percentages.
- Short explanation:
  - A single sentence based on strongest signals.

Controls row:

- Segmented tabs or compact buttons for mode:
  - `Greater China`
  - `Mainland only`
- Checkbox or toggle:
  - `Strict mode`
- Button:
  - `Run network probe`
- Copy button:
  - `Copy JSON`

Signal detail section:

- Use a single vertical list or two-column grid on desktop, one column on mobile.
- Each signal item shows:
  - Signal name
  - Status badge: `match`, `miss`, `unknown`, `unavailable`, `error`
  - Weight
  - Observed value
  - Plain explanation

Recommended signals:

- Language
- Time zone
- UTC offset fallback
- Emoji rendering
- Font availability
- Network reachability, optional and user-triggered

Network probe section:

- Default state: not run.
- Explain that running it loads small remote images and may be affected by VPN, proxy, blockers, or offline status.
- Show loading state per probe group:
  - `Global probes`
  - `Mainland control probes`
- Show per-URL results only after run.
- Provide a timeout select or small numeric input only if needed. Default to 3000 ms and avoid extra controls in v1.

Empty and unavailable states:

- SSR or prerender should not crash. Browser-only probes return `unavailable` until mounted.
- Canvas unavailable shows `unavailable`, not an exception.
- Network blocked/offline shows `unknown`, not failure.

## Scoring Model

Use transparent weights rather than boolean "any signal wins".

Suggested score table:

| Signal | Match | Notes |
|---|---:|---|
| Language | +3 | `zh*` in loose mode; mainland mode prefers `zh`, `zh-CN`, `zh-Hans`, `zh-Hans-CN` |
| Time zone exact | +3 | Mainland exact zones or Greater China zones depending on mode |
| UTC+8 fallback | +1 | Lower weight because it matches several non-China regions |
| Emoji rendering | +2 | Mainland-only hint when normal emoji renders but Taiwan flag is unavailable or monochrome |
| Font availability | +1 | Weak hint because fonts are easy to install and common in multilingual systems |
| Network probe | +4 | Highest weight if explicit probe indicates mainland network exit |

Confidence:

- `high`: score >= 7, or network probe match plus at least one local signal
- `medium`: score 4-6
- `low`: score 1-3
- `unknown`: no conclusive signals and one or more important probes unavailable

Overall result:

- In mainland mode, only mainland-compatible signals count as matches.
- In Greater China mode, language and time zone may include Hong Kong, Macau, and Taiwan.
- Emoji rendering should be described as a mainland device hint only.
- Network probe should be described as current network exit, not device identity.

## Pure Logic API

Create `src/lib/tools/china-user-detector.ts`.

Types:

```ts
export type ChinaDetectorMode = 'greater-china' | 'mainland'
export type ChinaDetectorStatus = 'match' | 'miss' | 'unknown' | 'unavailable' | 'error'
export type ChinaDetectorConfidence = 'high' | 'medium' | 'low' | 'unknown'

export interface ChinaDetectorOptions {
  mode: ChinaDetectorMode
  strict: boolean
}

export interface SignalResult {
  id: 'language' | 'timezone' | 'utc-offset' | 'emoji' | 'font' | 'network'
  status: ChinaDetectorStatus
  score: number
  maxScore: number
  observed: string[]
  reasonKey: string
}

export interface ChinaDetectorResult {
  mode: ChinaDetectorMode
  strict: boolean
  score: number
  maxScore: number
  confidence: ChinaDetectorConfidence
  resultKey: string
  summaryKey: string
  signals: SignalResult[]
}
```

Functions:

```ts
export function evaluateLanguageSignal(languages: string[], options: ChinaDetectorOptions): SignalResult
export function evaluateTimeZoneSignal(timeZone: string | undefined, options: ChinaDetectorOptions): SignalResult
export function evaluateUtcOffsetSignal(offsetMinutes: number, strict: boolean): SignalResult
export function evaluateAggregate(signals: SignalResult[], options: ChinaDetectorOptions): ChinaDetectorResult
export function readBrowserEnvironment(): BrowserEnvironment
export function detectEmojiSignal(): SignalResult
export function detectFontSignal(fontList?: string[]): SignalResult
export async function runNetworkProbe(options?: NetworkProbeOptions): Promise<NetworkProbeResult>
```

Keep easy-to-test logic parameterized. Browser-reading wrappers can be thin and defensive.

## Browser Signal Details

Language:

- Normalize tags with `trim()` and case-insensitive matching.
- Loose Greater China mode: `/^zh\b/i` or `/^zh-/i`.
- Mainland mode:
  - Accept `zh`, `zh-CN`, `zh-Hans`, `zh-Hans-CN`.
  - Do not accept `zh-TW`, `zh-HK`, `zh-MO`, `zh-Hant`.
- Strict mode checks only the first language.
- Non-strict mode checks all languages.

Time zone:

- Mainland zones:
  - `Asia/Shanghai`
  - `Asia/Chongqing`
  - `Asia/Harbin`
  - `Asia/Urumqi`
  - `Asia/Kashgar`
  - `Asia/Beijing`
  - `PRC`
- Greater China adds:
  - `Asia/Hong_Kong`
  - `Asia/Macau`
  - `Asia/Taipei`
  - `Hongkong`
  - `ROC`
- In strict mode, do not use UTC offset fallback.
- In loose mode, UTC+8 fallback is a separate low-weight signal.

Emoji:

- Run only in browser after mount.
- Return `unavailable` on Windows because Windows flag emoji behavior is not useful for this signal.
- Draw normal emoji, for example `😀`, as control.
- If control is unavailable or monochrome, return `unknown`.
- Draw a region flag such as `🇹🇼`.
- If control renders color but flag renders empty or monochrome, return a mainland hint.
- Never throw from Canvas errors.

Font:

- Run only in browser after mount.
- Use a conservative default font list:
  - `DengXian`
  - `FangSong`
  - `Microsoft YaHei`
  - `SimSun`
  - `SimHei`
  - `HarmonyOS Sans`
  - `Alibaba PuHuiTi`
- Treat as weak evidence.
- Show matched font names in observed values if possible.

Network:

- Run only after the user clicks.
- Default timeout: 3000 ms.
- Default "typically blocked from mainland" probes:
  - `https://www.gstatic.com/images/branding/searchlogo/ico/favicon.ico`
  - `https://chatgpt.com/favicon.ico`
- Default mainland control probes:
  - `https://www.baidu.com/favicon.ico`
- Result:
  - Any blocked-from-mainland probe reachable: `miss`
  - No blocked-from-mainland probe reachable and at least one mainland control reachable: `match`
  - Neither side reachable: `unknown`
- Add cache buster query.
- Mention that ad blockers, DNS, VPN, captive portals, and offline status affect results.

## Files To Modify

- Create: `src/lib/tools/china-user-detector.ts`
- Create: `src/lib/tools/china-user-detector.test.ts`
- Create: `src/pages/ChinaUserDetectorPage.tsx`
- Modify: `src/AppRoutes.tsx`
- Modify: `src/lib/routes.ts`
- Modify: `src/lib/tools-config.ts`
- Modify all locale files:
  - `src/i18n/locales/en/tools.json`
  - `src/i18n/locales/zh/tools.json`
  - `src/i18n/locales/ja/tools.json`
  - `src/i18n/locales/fr/tools.json`
  - `src/i18n/locales/ko/tools.json`
  - `src/i18n/locales/de/tools.json`
  - `src/i18n/locales/es/tools.json`
  - `src/i18n/locales/pt/tools.json`
  - `src/i18n/locales/ru/tools.json`

Likely icon:

- Use `Radar`, `Globe2`, `Languages`, or `ShieldQuestion` from `lucide-react`, depending on available exports in the installed version.

## i18n Key Shape

Add a `china-user-detector` object to every `tools.json`.

Minimum keys:

```json
{
  "china-user-detector": {
    "title": "China Environment Detector",
    "description": "Inspect browser, device, and optional network signals that may resemble a China environment. All local checks run in your browser.",
    "mode": "Detection scope",
    "greaterChina": "Greater China",
    "mainland": "Mainland only",
    "strict": "Strict mode",
    "runNetwork": "Run network probe",
    "runningNetwork": "Running probe...",
    "copyJson": "Copy JSON",
    "summary": "Summary",
    "signals": "Signals",
    "observed": "Observed",
    "score": "Score",
    "networkNotice": "Network probe loads small remote images and can be affected by VPNs, proxies, blockers, or offline status.",
    "status": {
      "match": "Match",
      "miss": "No match",
      "unknown": "Unknown",
      "unavailable": "Unavailable",
      "error": "Error"
    },
    "confidence": {
      "high": "High",
      "medium": "Medium",
      "low": "Low",
      "unknown": "Unknown"
    },
    "result": {
      "mainlandLikely": "Likely mainland China environment",
      "greaterChinaLikely": "Likely Greater China environment",
      "someSignals": "Some China-related signals",
      "noStrongSignals": "No strong China-related signals",
      "unknown": "Unable to judge"
    }
  }
}
```

Add signal names and reasons under nested keys:

```json
{
  "signals": {
    "language": "Language",
    "timezone": "Time zone",
    "utcOffset": "UTC offset",
    "emoji": "Emoji rendering",
    "font": "Fonts",
    "network": "Network reachability"
  },
  "reasons": {
    "languageZh": "Browser language includes a Chinese language tag.",
    "languageNone": "Browser languages do not include a matching Chinese language tag.",
    "timezoneExact": "The browser reports a known matching time zone.",
    "utcOffsetOnly": "The browser offset is UTC+8, which is weak evidence because several regions share it.",
    "emojiMainlandHint": "Emoji rendering suggests a mainland device configuration.",
    "fontMatched": "One or more common Chinese fonts appear available.",
    "networkMainlandHint": "Blocked-from-mainland probes failed while the mainland control probe loaded.",
    "networkNotRun": "Network probe has not been run."
  }
}
```

Exact wording can be adapted per language, but do not omit any locale.

## Task 1: Add Pure Signal Evaluation Tests

**Files:**

- Create: `src/lib/tools/china-user-detector.test.ts`
- Create: `src/lib/tools/china-user-detector.ts`

**Step 1: Write failing tests**

Cover:

- `zh-CN` matches mainland language.
- `zh-TW` matches Greater China but misses mainland.
- Strict language mode checks only the first language.
- `Asia/Shanghai` matches mainland.
- `Asia/Taipei` matches Greater China but misses mainland.
- UTC+8 fallback scores only in non-strict mode.
- Aggregate returns medium or high confidence based on score thresholds.
- Unknown/unavailable signals do not add score.

Example test skeleton:

```ts
import { describe, expect, it } from 'vitest'
import {
  evaluateAggregate,
  evaluateLanguageSignal,
  evaluateTimeZoneSignal,
  evaluateUtcOffsetSignal,
} from './china-user-detector'

describe('china user detector signals', () => {
  it('matches mainland Chinese language tags', () => {
    const result = evaluateLanguageSignal(['en-US', 'zh-CN'], { mode: 'mainland', strict: false })
    expect(result.status).toBe('match')
    expect(result.score).toBe(3)
  })
})
```

**Step 2: Run tests and verify failure**

Run:

```bash
pnpm test:run src/lib/tools/china-user-detector.test.ts
```

Expected: fail because the module does not exist or functions are not implemented.

## Task 2: Implement Pure Evaluation Logic

**Files:**

- Modify: `src/lib/tools/china-user-detector.ts`
- Test: `src/lib/tools/china-user-detector.test.ts`

**Step 1: Implement constants and pure evaluators**

Add:

- Type definitions
- Known time zone arrays
- Language matching helpers
- `evaluateLanguageSignal`
- `evaluateTimeZoneSignal`
- `evaluateUtcOffsetSignal`
- `evaluateAggregate`

**Step 2: Run focused tests**

Run:

```bash
pnpm test:run src/lib/tools/china-user-detector.test.ts
```

Expected: pass.

**Step 3: Commit**

Only if the user asks to commit:

```bash
git add src/lib/tools/china-user-detector.ts src/lib/tools/china-user-detector.test.ts
git commit -m "feat(security): add China environment signal evaluator"
```

## Task 3: Add Browser-Only Probes

**Files:**

- Modify: `src/lib/tools/china-user-detector.ts`
- Modify: `src/lib/tools/china-user-detector.test.ts`

**Step 1: Add tests for dependency-injected helpers**

Avoid brittle DOM tests where possible. Test logic with injected probe results:

- Network probe summary: blocked probe reachable means no mainland network hint.
- Network probe summary: blocked probes unreachable and control reachable means mainland network hint.
- Network probe summary: both groups unreachable means unknown.

**Step 2: Implement browser wrappers**

Implement:

- `readBrowserEnvironment`
- `detectEmojiSignal`
- `detectFontSignal`
- `runNetworkProbe`
- Any internal helper needed for Canvas and image probing

Browser wrappers must:

- Check `typeof window`, `typeof document`, `typeof navigator`, `typeof Image`
- Return `unavailable` or `unknown` instead of throwing
- Avoid leaving DOM nodes attached
- Avoid logging

**Step 3: Run focused tests**

Run:

```bash
pnpm test:run src/lib/tools/china-user-detector.test.ts
```

Expected: pass.

## Task 4: Build the React Page

**Files:**

- Create: `src/pages/ChinaUserDetectorPage.tsx`

**Step 1: Create page component**

Use:

- `ToolLayout`
- `Button`
- `Badge`
- `Checkbox`
- `Tabs` or compact existing buttons
- `useClipboard`
- `useTranslation('tools')`

Recommended state:

```ts
const [mode, setMode] = useState<ChinaDetectorMode>('greater-china')
const [strict, setStrict] = useState(false)
const [networkSignal, setNetworkSignal] = useState<SignalResult | null>(null)
const [networkLoading, setNetworkLoading] = useState(false)
const [networkError, setNetworkError] = useState<string | null>(null)
```

Use `useEffect` for browser-only local probes after mount.

**Step 2: Layout**

Structure:

- `ToolLayout`
- Summary panel
- Controls row
- Signal detail list
- Network probe panel
- JSON output or copy control

Desktop:

- Summary panel full width.
- Details as `grid gap-3 md:grid-cols-2`.

Mobile:

- Controls wrap naturally.
- Signal list is one column.
- Buttons have short labels and do not wrap awkwardly.

**Step 3: Accessibility**

- Network button has `aria-busy` while loading.
- Copy button has accessible label.
- Strict checkbox has visible label.
- Status badges include text, not only color.
- Result score is text, not only visual fill.

## Task 5: Register Route and Tool

**Files:**

- Modify: `src/AppRoutes.tsx`
- Modify: `src/lib/routes.ts`
- Modify: `src/lib/tools-config.ts`

**Step 1: Route type**

Add to `TOOL_ROUTES`:

```ts
'/security/china-user-detector'
```

Use the actual patch syntax, not the leading plus in code.

**Step 2: App route**

Import page:

```ts
import { ChinaUserDetectorPage } from '@/pages/ChinaUserDetectorPage'
```

Add route:

```tsx
<Route path="security/china-user-detector" element={<ChinaUserDetectorPage />} />
```

**Step 3: Tool config**

Add to `TOOLS` near other Security tools:

```ts
{
  id: 'china-user-detector',
  title: 'China Environment Detector',
  descriptionKey: 'china-user-detector.description',
  href: '/security/china-user-detector',
  icon: Radar,
  category: 'Security',
}
```

If `Radar` is unavailable in the installed lucide version, use `Globe2` or `Languages`.

## Task 6: Add i18n

**Files:**

- Modify all 9 `src/i18n/locales/*/tools.json` files.

**Step 1: Add English first**

Add all required keys in `src/i18n/locales/en/tools.json`.

**Step 2: Add other locales**

Add equivalent keys to:

- `zh`
- `ja`
- `fr`
- `ko`
- `de`
- `es`
- `pt`
- `ru`

Keep key structure identical across locales.

**Step 3: Check JSON validity**

Run:

```bash
node -e "const fs=require('fs'); for (const f of fs.readdirSync('src/i18n/locales')) JSON.parse(fs.readFileSync(`src/i18n/locales/${f}/tools.json`, 'utf8')); console.log('ok')"
```

Expected: `ok`.

## Task 7: Taste and UX Review

**Files:**

- Review: `src/pages/ChinaUserDetectorPage.tsx`

**Step 1: Run local dev server**

Run:

```bash
pnpm dev
```

Open:

```text
http://localhost:5173/security/china-user-detector
```

If 5173 is occupied, use the Vite printed URL.

**Step 2: Visual checklist**

Verify:

- No marketing hero.
- The summary is readable at a glance.
- Signal details are compact but not cramped.
- Network probe is visibly optional.
- Loading state is clear.
- Error and unknown states are distinct.
- Buttons and labels do not wrap on desktop.
- Mobile layout is one column with no overlap.
- Dark mode has readable contrast.
- No visible copy uses em dashes.
- No fake precision, percentages, or decorative status dots.

**Step 3: Accessibility checklist**

Verify:

- Keyboard can reach every control.
- Focus rings are visible.
- Checkboxes and buttons have text labels.
- Status is not conveyed by color alone.
- Network loading state announces through text and disabled state.

## Task 8: Build Verification

**Files:**

- All files touched above.

**Step 1: Run tests**

```bash
pnpm test:run
```

Expected: all tests pass.

**Step 2: Run build**

```bash
pnpm build
```

Expected: TypeScript, Vite build, and prerender all pass.

**Step 3: Inspect git status**

```bash
git status --short
```

Expected: only files relevant to this feature are changed.

## Definition Of Done

- Tool is available at `/security/china-user-detector` and locale-prefixed routes.
- The home page lists the tool under Security.
- All visible text uses `useTranslation` with explicit `tools` namespace where appropriate.
- No upstream source is copied.
- Pure evaluators have Vitest coverage.
- Browser-only APIs are guarded.
- Network probe is opt-in and clearly explained.
- JSON copy includes mode, strict flag, aggregate result, and signal details.
- `pnpm test:run` passes.
- `pnpm build` passes.
- UI has passed the taste review checklist above.

