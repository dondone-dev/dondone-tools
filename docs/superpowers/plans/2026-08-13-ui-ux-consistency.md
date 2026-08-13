# dondone-tools UI/UX Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make dondone-tools tool pages use consistent input sizing, output behavior, feedback patterns, responsive rules, and a reusable UI/UX Skill for future tools.

**Architecture:** Keep the existing shadcn-style primitives as the source of truth, add semantic textarea variants and tool feedback primitives, then migrate repeated page-local classes and components to those primitives. Preserve specialized image, file, table, and chart layouts while applying the same control and feedback contracts.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Radix UI, lucide-react, react-i18next, Vitest, Vite.

## Global Constraints

- All user-facing strings continue to use `useTranslation` and existing locale keys.
- No pure tool computation logic or route behavior changes.
- Shared UI primitives define dimensions; pages use semantic variants instead of arbitrary height/overflow classes.
- Keep existing image/file/table/chart-specific layouts where their constraints are intentional.
- Run `pnpm test:run`, `pnpm build`, and `pnpm lint` before declaring completion.
- Stage only files relevant to this UI consistency change; preserve unrelated worktree changes.

## File map

- Modify `src/components/ui/textarea.tsx`: add the `default`, `compact`, and `editor` semantic sizing variants and export the variant helper.
- Create `src/components/ui/textarea-variants.ts`: keep the non-component CVA contract separate so Fast Refresh linting remains clean.
- Modify `src/components/ui/select.tsx`: retain the existing `default`/`sm` contract and migrate consumers away from raw height overrides.
- Create `src/components/tools/ToolFeedback.tsx`: shared error, status, and copyable result field primitives.
- Modify representative and remaining text-tool pages under `src/pages/`: consume textarea variants and shared feedback primitives.
- Create `src/components/ui/textarea.test.ts`: verify the public variant contract without requiring a browser renderer.
- Create `docs/design-system.md`: versioned project-level quick reference for the implemented UI language.
- Create `/Users/joecovert/.codex/skills/dondone-tools-ui-ux/SKILL.md` and its generated `agents/openai.yaml`: auto-discoverable guidance for future dondone-tools UI work.
- Modify `AGENTS.md`: point contributors to the versioned design system and Skill when adding or changing tools.

### Task 1: Add a failing textarea variant contract test

**Files:**
- Create: `src/components/ui/textarea.test.ts`

**Interfaces:**
- Consumes: the future exported `textareaVariants` helper from `src/components/ui/textarea.tsx`.
- Produces: executable evidence for the `default`, `compact`, and `editor` class contracts.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { textareaVariants } from './textarea-variants'

describe('textareaVariants', () => {
  it('keeps a fixed default height with bounded vertical resizing', () => {
    const classes = textareaVariants()

    expect(classes).toContain('h-32')
    expect(classes).toContain('max-h-96')
    expect(classes).toContain('resize-y')
    expect(classes).toContain('overflow-y-auto')
    expect(classes).not.toContain('field-sizing-content')
  })

  it('exposes semantic compact and editor sizing variants', () => {
    expect(textareaVariants({ variant: 'compact' })).toContain('h-24')
    expect(textareaVariants({ variant: 'compact' })).toContain('max-h-64')
    expect(textareaVariants({ variant: 'editor' })).toContain('h-64')
    expect(textareaVariants({ variant: 'editor' })).toContain('max-h-[32rem]')
  })
})
```

- [ ] **Step 2: Run the focused test and verify it fails for the missing contract**

Run: `pnpm vitest run src/components/ui/textarea.test.ts`

Expected: FAIL because `textareaVariants` is not yet defined in `textarea-variants.ts` and the current textarea still uses content-sized growth.

### Task 2: Implement shared control and feedback primitives

**Files:**
- Modify: `src/components/ui/textarea.tsx`
- Create: `src/components/tools/ToolFeedback.tsx`
- Test: `src/components/ui/textarea.test.ts`

**Interfaces:**
- Consumes: the failing variant contract from Task 1, `Button`, `Label`, `useTranslation`, and `useClipboard` conventions.
- Produces: `Textarea` with `variant?: 'default' | 'compact' | 'editor'`; `textareaVariants` from `textarea-variants.ts`; `ToolError`; `ToolStatus`; and `ToolResultField`.

- [ ] **Step 1: Add the minimal textarea variant implementation**

Use `cva` with a shared base containing `h-32`, `min-h-32`, `max-h-96`, `resize-y`, and `overflow-y-auto`; define compact as `h-24 min-h-24 max-h-64` and editor as `h-64 min-h-64 max-h-[32rem]`. Remove `field-sizing-content`.

- [ ] **Step 2: Run the focused test and verify it passes**

Run: `pnpm vitest run src/components/ui/textarea.test.ts`

Expected: PASS with both variant assertions green.

- [ ] **Step 3: Add shared feedback primitives**

Implement the following API without introducing new translation keys:

```tsx
<ToolError message={error} />
<ToolStatus icon={<Loader2 />} message={t('...')} />
<ToolResultField label={label} value={value} copiedText={copiedText} onCopy={copy} multiline />
```

`ToolError` must render `role="alert"`; `ToolStatus` must render `role="status"`; `ToolResultField` must use the existing `ui.copy` and `ui.copied` keys, an at-least-32px copy action, `break-all`, and bounded multiline output.

- [ ] **Step 4: Run the focused test again and run TypeScript checks**

Run: `pnpm vitest run src/components/ui/textarea.test.ts && pnpm exec tsc -b --pretty false`

Expected: PASS and exit code 0.

### Task 3: Migrate text-tool inputs to semantic textarea variants

**Files:**
- Modify: `src/components/tools/HashToolLayout.tsx`
- Modify: `src/pages/AesPage.tsx`
- Modify: `src/pages/Base58Page.tsx`
- Modify: `src/pages/Base64Page.tsx`
- Modify: `src/pages/Base64ImagePage.tsx`
- Modify: `src/pages/BpSignPage.tsx`
- Modify: `src/pages/JsonFormatPage.tsx`
- Modify: `src/pages/JwtDecodePage.tsx`
- Modify: `src/pages/MarkdownToHtmlPage.tsx`
- Modify: `src/pages/RegexPage.tsx`
- Modify: `src/pages/SensitiveMaskerPage.tsx`
- Modify: `src/pages/StringLengthPage.tsx`
- Modify: `src/pages/SupabaseRlsPage.tsx`
- Modify: `src/pages/TextDiffPage.tsx`
- Modify: `src/pages/UrlEncodePage.tsx`
- Modify: `src/pages/UuidPage.tsx`
- Modify: `src/pages/OcrPage.tsx`

**Interfaces:**
- Consumes: `Textarea` variants from Task 2.
- Produces: no page-local textarea height/resize/scroll policy for the migrated text inputs.

- [ ] **Step 1: Replace arbitrary textarea sizing with semantic variants**

Use `variant="default"` for ordinary text/encoding/hash inputs, `variant="compact"` for Base64 and short token fields, and `variant="editor"` for JSON, JWT, Markdown, diff, sensitive-masker, SQL, and long-form editor inputs. Preserve non-sizing classes such as `font-mono`, `bg-muted/30`, `pr-12`, and `readOnly`.

- [ ] **Step 2: Migrate OCR's hand-authored textarea to the shared primitive**

Replace the raw `<textarea>` in `OcrPage` with `Textarea variant="default"`, keeping its overlay copy button and adding an explicit accessible label if the existing aria labeling does not cover it.

- [ ] **Step 3: Search for and remove migrated textarea sizing overrides**

Run: `rg -n --glob '*.tsx' 'field-sizing-content|<Textarea[^>]*className="[^"]*(min-h|max-h|resize|overflow-y)' src/pages src/components`

Expected: no migrated text input remains with raw sizing policy; only intentional non-input preview/image/layout matches remain and are manually reviewed.

### Task 4: Migrate repeated errors, results, and select/button density

**Files:**
- Modify: `src/components/tools/HashToolLayout.tsx`
- Modify: `src/pages/AesPage.tsx`
- Modify: `src/pages/Base58Page.tsx`
- Modify: `src/pages/Base64Page.tsx`
- Modify: `src/pages/Base64ImagePage.tsx`
- Modify: `src/pages/BpJwtPage.tsx`
- Modify: `src/pages/BpSignPage.tsx`
- Modify: `src/pages/ColorPage.tsx`
- Modify: `src/pages/ExifPage.tsx`
- Modify: `src/pages/IdCardPage.tsx`
- Modify: `src/pages/JsonFormatPage.tsx`
- Modify: `src/pages/JwtDecodePage.tsx`
- Modify: `src/pages/OcrPage.tsx`
- Modify: `src/pages/QrCodeDecodePage.tsx`
- Modify: `src/pages/QrCodePage.tsx`
- Modify: `src/pages/RegexPage.tsx`
- Modify: `src/pages/SensitiveMaskerPage.tsx`
- Modify: `src/pages/SupabaseRlsPage.tsx`
- Modify: `src/pages/TextDiffPage.tsx`
- Modify: `src/pages/TimestampPage.tsx`
- Modify: `src/pages/UrlEncodePage.tsx`
- Modify: `src/pages/UuidPage.tsx`
- Modify: `src/pages/ZipInspectorPage.tsx`
- Modify: `src/pages/BgRemovePage.tsx`

**Interfaces:**
- Consumes: `ToolError`, `ToolStatus`, `ToolResultField` and `SelectTrigger size="sm"`.
- Produces: consistent error and copyable result behavior for representative and remaining text-oriented tools.

- [ ] **Step 1: Replace repeated error paragraphs with `ToolError`**

Preserve each page's translated message and conditional rendering, but remove duplicated background/padding/typography classes. Keep code-font styling only where it materially improves parsing of a code error, using a documented `className` extension.

- [ ] **Step 2: Replace local copyable result fields with `ToolResultField`**

Start with Hash, Base64, Base58, AES, BP JWT/BP Sign, Timestamp, Id Card, and Color. Preserve specialized JSON/tree/table output components where a field primitive would reduce information density or break semantics.

- [ ] **Step 3: Normalize compact control usage**

Replace page-local `SelectTrigger className="... h-8 ..."` with `size="sm"` and remove result copy buttons using `h-6`; rely on `ToolResultField`'s minimum action height. Keep icon-only buttons on `aria-label`.

- [ ] **Step 4: Run the UI pattern audit**

Run: `rg -n --glob '*.tsx' 'text-destructive bg-destructive/10|className="[^"]*h-6[^"]*"|SelectTrigger[^>]*className="[^"]*h-8|<Textarea[^>]*className="[^"]*(min-h|max-h|resize|overflow-y)' src/pages src/components`

Expected: remaining matches are explicitly specialized layouts, not duplicated generic tool feedback or input sizing.

### Task 5: Version the design system and create the auto-discoverable Skill

**Files:**
- Create: `docs/design-system.md`
- Modify: `AGENTS.md`
- Create externally with the Skill Creator initializer: `/Users/joecovert/.codex/skills/dondone-tools-ui-ux/SKILL.md`
- Create externally with the initializer: `/Users/joecovert/.codex/skills/dondone-tools-ui-ux/agents/openai.yaml`

**Interfaces:**
- Consumes: the implemented component contracts from Tasks 2–4 and the approved design spec.
- Produces: one versioned project reference and one auto-discoverable Codex Skill for future tool pages.

- [ ] **Step 1: Create the Skill directory with `init_skill.py`**

Run:

```bash
python /Users/joecovert/.codex/skills/.system/skill-creator/scripts/init_skill.py dondone-tools-ui-ux --path /Users/joecovert/.codex/skills --interface display_name="dondone-tools UI/UX" --interface short_description="Apply dondone-tools UI and interaction standards" --interface default_prompt="Use the dondone-tools UI/UX standards when adding or reviewing a tool page."
```

Expected: the skill folder contains `SKILL.md` and `agents/openai.yaml`.

- [ ] **Step 2: Write the concise Skill body**

Document trigger symptoms, required component choices, textarea variant table, feedback and accessibility rules, page composition, exception rules for specialized tools, and a final audit checklist. Keep the description trigger-focused and the body under 500 lines.

- [ ] **Step 3: Validate the Skill**

Run: `python /Users/joecovert/.codex/skills/.system/skill-creator/scripts/quick_validate.py /Users/joecovert/.codex/skills/dondone-tools-ui-ux`

Expected: validation succeeds with no frontmatter or structure errors.

- [ ] **Step 4: Add the versioned project quick reference and AGENTS pointer**

Keep `docs/design-system.md` aligned with the actual shared APIs and add an `AGENTS.md` section that points future contributors to it and the `dondone-tools-ui-ux` Skill.

### Task 6: Verify behavior, build, lint, and visual consistency

**Files:**
- Modify only if verification discovers a concrete issue in files from Tasks 2–5.

**Interfaces:**
- Consumes: all completed implementation tasks.
- Produces: evidence that the full project compiles, tests, lints, and has no obvious remaining generic UI drift.

- [ ] **Step 1: Run the full test suite**

Run: `pnpm test:run`

Expected: all tests pass.

- [ ] **Step 2: Run the production build**

Run: `pnpm build`

Expected: benchmark build, TypeScript, Vite bundle, and prerender all exit 0.

- [ ] **Step 3: Run lint**

Run: `pnpm lint`

Expected: exit 0 with no new warnings or errors.

- [ ] **Step 4: Perform a browser smoke review**

Start the app with the existing dev command and inspect representative default, compact, and editor tools in light/dark mode at desktop and narrow mobile widths. Verify empty/input-filled heights, manual resize, max-height scrolling, focus rings, error alert placement, copy feedback, and no horizontal overflow.

- [ ] **Step 5: Re-run the pattern audit and review the diff**

Run the searches from Tasks 3 and 4, then `git diff --check` and `git diff --stat`. Confirm unrelated changes remain unstaged and no user-facing strings were hardcoded.

- [ ] **Step 6: Commit the implementation**

```bash
git add AGENTS.md docs/design-system.md src/components/ui/textarea.tsx src/components/ui/textarea.test.ts src/components/tools/ToolFeedback.tsx src/components/ui/select.tsx src/components/layout/ToolLayout.tsx src/components/tools/HashToolLayout.tsx src/pages
git commit -m "refactor(ui): unify tool input and feedback patterns" -m "Co-authored-by: openai-codex[bot] <openai-codex[bot]@users.noreply.github.com>"
```
