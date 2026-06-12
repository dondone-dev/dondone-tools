# Agent Guidelines

## Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/). Subject line in English, imperative mood, ≤72 chars, no trailing period.

```
feat(scope): add password entropy meter
fix(i18n): missing translation key for zh locale
chore(deps): upgrade react-i18next to 15.x
```

Types: `feat` `fix` `refactor` `chore` `docs` `test` `perf` `style` `ci`

Stage only the files relevant to the change — never `git add .`.

If the commit was implemented by an AI agent, append a `Co-Authored-By` trailer so GitHub surfaces the agent in the Contributors list.

| Agent | Trailer (copy exactly) | Verified |
|---|---|---|
| Claude Code (Anthropic) | `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>` | ✓ |
| Cursor | `Co-authored-by: Cursor <cursoragent@cursor.com>` | ✓ |
| OpenAI Codex | `Co-authored-by: openai-codex[bot] <openai-codex[bot]@users.noreply.github.com>` | — verify from first commit |
| Google Jules / Gemini | `Co-authored-by: google-labs-jules[bot] <google-labs-jules[bot]@users.noreply.github.com>` | — verify from first commit |
| opencode (sst) | `Co-authored-by: opencode[bot] <opencode[bot]@users.noreply.github.com>` | — verify from first commit |

For unverified agents: run `git log --format="%B" -1` after the tool's first commit to get the exact trailer it injected, then update this table.

## Architecture

```
src/
  components/layout/   # Shell components (Header, Footer, LocaleLayout)
  components/tools/    # Shared tool UI (HashToolLayout, etc.)
  components/ui/       # shadcn primitives — edit sparingly
  pages/               # One file per tool page (*Page.tsx)
  lib/tools/           # Pure computation logic (no React)
  lib/tools-config.ts  # Tool registry — add new tools here
  lib/routes.ts        # TOOL_ROUTES const — keep in sync with App.tsx
  i18n/locales/        # Translation files (see i18n section)
```

New tool checklist:
1. Add logic to `src/lib/tools/`
2. Add page to `src/pages/`
3. Register in `src/lib/routes.ts` and `src/lib/tools-config.ts`
4. Add route in `src/App.tsx`
5. Add translation keys to all 9 locale files

## i18n

All user-facing strings must go through `useTranslation`. Never hardcode UI text.

- `common.json` — navigation, categories, site-wide copy
- `tools.json` — per-tool title, description, and UI labels

Supported locales: `en` (default, no URL prefix) · `zh` · `ja` · `fr` · `ko` · `de` · `es` · `pt` · `ru`

When adding a new string:
1. Add the key to `en` first
2. Add translations for all other locales in the same commit
3. Use `t('key', { ns: 'namespace' })` — always specify `ns` explicitly

## Tests

Tests live alongside source in `src/lib/tools/*.test.ts`. Write tests for all pure computation functions. No tests needed for React components or UI layout.

Run before committing: `pnpm test:run`

## Build Verification

Always verify the build passes locally before committing. The CI pipeline runs `pnpm build` (which includes `tsc -b` type-checking, Vite bundling, and the prerender script) — a failure there blocks deployment and is harder to debug than catching it locally.

```bash
pnpm build
```

Do not commit if this command exits with a non-zero code. Common causes of silent build failures:

- Renaming a hook return value (e.g. `copied` → `copiedText`) without updating all consumers
- Adding a new import that doesn't resolve
- A TypeScript error that only surfaces when all files are checked together

## UI/UX Review

When designing a new page, modifying an existing layout, or accepting code that touches UI components, run `/taste-skill` to audit the result before committing.

Things to check with `/taste-skill`:

- Visual hierarchy and spacing — do headings, labels, and content feel proportional?
- Interaction feedback — do buttons, copy actions, and loading states communicate clearly?
- Consistency — do new components match the patterns already established in the codebase (copy button style, result field layout, error display)?
- Accessibility — are interactive elements reachable by keyboard, do icons have labels or `aria-label`?
- Dark mode — does the page look correct with the dark theme toggled on?

Do not mark a UI task as done without running `/taste-skill` first.

## Style

- No comments unless the *why* is non-obvious
- No `console.log` left in committed code
- Prefer editing existing files over creating new ones
