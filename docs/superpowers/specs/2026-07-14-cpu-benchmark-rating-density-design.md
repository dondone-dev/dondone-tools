# CPU Benchmark Rating and Density Design

## Goal

Add a version-scoped performance rating beside the final benchmark score and align the CPU benchmark page with the compact sizing used by existing dondone tools.

## Rating

The rating applies only to `CPU-WASM v1 Baseline`. It is not a CPU model comparison, percentile, or official hardware grade.

| Score | Rating |
| --- | --- |
| Below 250,000 | Basic |
| 250,000-399,999 | Good |
| 400,000-599,999 | Excellent |
| 600,000 and above | Exceptional |

The rating is computed by a pure function so thresholds are centralized and covered by boundary tests. The result screen places the translated rating beside the score and displays a short version-scope note.

## Density

This is a preserve-mode adjustment. It keeps the route, state flow, information architecture, colors, radii, dark mode, accessibility, and benchmark behavior intact.

- Use standard project button sizing instead of large buttons or forced 44px heights.
- Reduce outer panel padding from 20-24px to 12-16px.
- Reduce the final score from 48px to 30px while retaining monospace emphasis.
- Reduce duration selector height, preparation whitespace, metric padding, chart height, and vertical gaps.
- Preserve explicit mobile grids and readable touch targets.

Design dials: variance 3, motion 2, density 8. The existing shadcn/Tailwind token system remains the only design system.

## Validation

- Unit-test every rating threshold boundary.
- Validate all nine locales contain the new keys.
- Run scoped lint, `pnpm test:run`, and `pnpm build`.
- Check setup and result states in light, dark, desktop, and mobile layouts.
