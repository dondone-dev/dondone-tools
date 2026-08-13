# dondone-tools UI/UX Design System

This is the project-level source of truth for tool-page interaction patterns. Keep it aligned with the shared primitives in `src/components/ui/` and `src/components/tools/`.

## Page structure

Use `ToolLayout` and keep the content order: input/settings → primary action → error/status → result/download. Use `space-y-4` between regions and `gap-3` between adjacent controls. Action groups must wrap on narrow screens.

## Control baseline

- `Input`: use the default single-line height; do not add arbitrary `h-*` classes.
- `SelectTrigger`: default size for normal settings, `size="sm"` for compact settings; do not write `h-8` directly.
- `Button`: use named sizes. Copy and secondary actions use at least `min-h-8`; icon-only buttons use a named icon size and an accessible label.
- Labels are visible or replaced by an equivalent accessible name. Placeholders never act as the only label.

## Textarea variants

`Textarea` always receives a semantic `variant` and owns its height, resize, and overflow behavior:

| Variant | Height | Max height | Use |
| --- | --- | --- | --- |
| `default` | 8rem | 24rem | Ordinary text, hashes, encoders, URLs, regex, short config |
| `compact` | 6rem | 16rem | Base64/Base58, short tokens, compact fields |
| `editor` | 16rem | 32rem | JSON/JWT/Markdown, diffs, SQL, sensitive text, long lists |

All variants start at a stable height, allow vertical resizing, and scroll internally after the max height. Do not add `field-sizing-content`, `rows`, `min-h-*`, `max-h-*`, `resize-*`, or `overflow-y-*` to a page-level textarea.

## Feedback and output

- Use `ToolError` for errors (`role="alert"`).
- Use `ToolStatus` for asynchronous status (`role="status"`).
- Use `ToolResultField` for ordinary copyable text. Pass `multiline` for formatted or long values.
- Keep specialized JSON trees, tables, image previews, and file lists when their semantics require them; still use shared errors, named button sizes, and visible focus states.

## Accessibility and review

Preserve focus-visible rings, keyboard operation, translated strings, dark-mode contrast, and no horizontal overflow. Before finishing a tool, check empty/filled/maximum textarea states, copy feedback, error placement, narrow mobile layout, light/dark mode, and run `pnpm test:run`, `pnpm build`, and `pnpm lint`.
