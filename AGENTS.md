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

## Style

- No comments unless the *why* is non-obvious
- No `console.log` left in committed code
- Prefer editing existing files over creating new ones
