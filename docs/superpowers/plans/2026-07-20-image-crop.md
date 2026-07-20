# Image Crop Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Image Crop" tool (`/image/crop`) that lets users crop a JPEG/PNG/WebP image — free-form, by aspect ratio, or to an exact pixel size — then compress and download the result, reusing the existing img-compress codec pipeline.

**Architecture:** A pure, fully-tested rect/ratio math module (`img-crop.ts`) is driven by a thin pointer-events interaction component (`ImageCropCanvas.tsx`). Cropping reuses the JPEG/PNG/WebP WASM encoders already built for the Image Compressor tool via a small refactor that exposes an `encodeImageData` function. The format/quality/lossless settings UI is extracted from the existing compress page into a shared `CompressSettingsPanel.tsx` so both tools stay visually and behaviorally identical.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind, shadcn/radix-ui primitives, `@jsquash/*` WASM codecs, `react-i18next`, Vitest (`happy-dom` environment).

## Global Constraints

- Follow Conventional Commits for every commit (`feat(...)`, `fix(...)`, `refactor(...)`, `test(...)`, `docs(...)`), imperative mood, ≤72 chars, no trailing period.
- Append `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>` to every commit trailer.
- Stage only files relevant to each commit — never `git add .` / `git add -A`.
- All user-facing strings go through `useTranslation`; never hardcode UI text. New keys go in `tools.json` for all 9 locales (`en, zh, ja, fr, ko, de, es, pt, ru`) in the same commit as the feature that introduces them.
- No comments unless the *why* is non-obvious. No `console.log` in committed code.
- Tests live alongside source (`src/lib/tools/*.test.ts`). Pure computation functions get tests; React components/UI layout do not (matches existing `img-compress.test.ts`, which only tests `detectFormat`/`formatBytes`/`buildOutputFilename`, not the canvas/WASM paths).
- Run `pnpm test:run` and `pnpm build` before considering any task done — `pnpm build` runs `tsc -b`, so a type error anywhere fails the whole build.
- Max upload size 20 MB, accepted formats JPEG/PNG/WebP — identical to the Image Compressor tool's `MAX_BYTES` / `detectFormat`.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/tools/img-compress.ts` (modify) | Extract `encodeImageData` from `compressImage` so the crop tool can reuse the codec pipeline without re-deriving it. |
| `src/lib/tools/img-crop.ts` (new) | Pure rect/ratio math (testable) + canvas crop/resize + `cropAndEncode` orchestration (not unit-tested, same convention as `img-compress.ts`'s canvas code). |
| `src/lib/tools/img-crop.test.ts` (new) | Unit tests for every pure function in `img-crop.ts`. |
| `src/components/tools/CompressSettingsPanel.tsx` (new) | Output-format selector + lossless toggle + quality slider, extracted from `ImgCompressPage.tsx` so both tools share one implementation. |
| `src/pages/ImgCompressPage.tsx` (modify) | Use `CompressSettingsPanel` instead of inline JSX; behavior unchanged. |
| `src/components/tools/ImageCropCanvas.tsx` (new) | Pointer-driven crop-box overlay; delegates all rect math to `img-crop.ts`. |
| `src/pages/ImgCropPage.tsx` (new) | Page shell: upload → edit (mode tabs + canvas + settings panel) → result (tab preview + download + re-crop). |
| `src/lib/routes.ts` (modify) | Add `/image/crop` to `TOOL_ROUTES`. |
| `src/lib/tools-config.ts` (modify) | Register the `img-crop` tool entry + `Crop` icon import. |
| `src/AppRoutes.tsx` (modify) | Lazy import `ImgCropPage` and add its `<Route>`. |
| `src/i18n/locales/{en,zh,ja,fr,ko,de,es,pt,ru}/tools.json` (modify) | Add the `img-crop` namespace to all 9 locales. |

---

### Task 1: Extract `encodeImageData` from `img-compress.ts`

**Files:**
- Modify: `src/lib/tools/img-compress.ts:94-117`
- Test: `src/lib/tools/img-compress.test.ts` (existing — must keep passing unchanged)

**Interfaces:**
- Produces: `encodeImageData(data: ImageData, width: number, height: number, opts: CompressOptions): Promise<CompressResult>` — exported, used by `img-crop.ts` in Task 3.
- `compressImage(file: File, opts: CompressOptions): Promise<CompressResult>` — signature unchanged, now implemented via `fileToImageData` + `encodeImageData`.

This is a pure refactor with no behavior change, so there is no new failing test to write first — instead, the existing test suite is the regression guard.

- [ ] **Step 1: Run the existing test suite to record the baseline**

Run: `pnpm test:run -- img-compress`
Expected: PASS (all existing `img-compress.test.ts` cases green)

- [ ] **Step 2: Split `compressImage` into `fileToImageData` + `encodeImageData`**

Replace lines 94-117 of `src/lib/tools/img-compress.ts` (the current `compressImage` function) with:

```ts
export async function encodeImageData(
  data: ImageData,
  width: number,
  height: number,
  opts: CompressOptions,
): Promise<CompressResult> {
  const target: InputFormat = opts.outputFormat

  if (target === 'jpeg') {
    await ensureJpeg()
    const buffer = await encodeJpeg(data, { quality: opts.quality })
    return { buffer, format: 'jpeg', mimeType: 'image/jpeg', extension: 'jpg', width, height }
  }

  if (target === 'png') {
    await ensurePng()
    const buffer = await encodePng(data)
    return { buffer, format: 'png', mimeType: 'image/png', extension: 'png', width, height }
  }

  await ensureWebp()
  const buffer = await encodeWebp(data, { quality: opts.quality, lossless: opts.lossless ? 1 : 0 })
  return { buffer, format: 'webp', mimeType: 'image/webp', extension: 'webp', width, height }
}

export async function compressImage(
  file: File,
  opts: CompressOptions,
): Promise<CompressResult> {
  const { data, width, height } = await fileToImageData(file)
  return encodeImageData(data, width, height, opts)
}
```

- [ ] **Step 3: Run the test suite again to confirm no regression**

Run: `pnpm test:run -- img-compress`
Expected: PASS (identical results to Step 1)

- [ ] **Step 4: Run the full build to catch any type error from the export change**

Run: `pnpm build`
Expected: exits 0

- [ ] **Step 5: Commit**

```bash
git add src/lib/tools/img-compress.ts
git commit -m "$(cat <<'EOF'
refactor(img-compress): extract encodeImageData for reuse

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Pure rect/ratio math — `img-crop.ts`

**Files:**
- Create: `src/lib/tools/img-crop.ts`
- Test: `src/lib/tools/img-crop.test.ts`

**Interfaces:**
- Produces (consumed by Task 3, Task 5, Task 6):
  - `interface CropRect { x: number; y: number; width: number; height: number }`
  - `type CropMode = 'free' | 'aspect' | 'fixed'`
  - `type Anchor = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'`
  - `type Handle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'`
  - `const MIN_CROP_SIZE = 10`
  - `clampRectToBounds(rect: CropRect, imgWidth: number, imgHeight: number, minSize?: number): CropRect`
  - `moveRect(rect: CropRect, dx: number, dy: number, imgWidth: number, imgHeight: number): CropRect`
  - `resizeRect(rect: CropRect, handle: Handle, dx: number, dy: number): CropRect`
  - `enforceAspectRatio(rect: CropRect, newWidth: number, ratio: number, anchor: Anchor): CropRect`
  - `resizeRectWithRatio(rect: CropRect, handle: 'ne' | 'nw' | 'se' | 'sw', ratio: number, dx: number): CropRect`
  - `parseCustomRatio(input: string): number | null`
  - `computeExportSize(rect: CropRect, mode: CropMode, fixedSize: { width: number; height: number } | null): { width: number; height: number }`
  - `initialCropRect(imgWidth: number, imgHeight: number, ratio: number | null): CropRect`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/tools/img-crop.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  MIN_CROP_SIZE,
  clampRectToBounds,
  moveRect,
  resizeRect,
  enforceAspectRatio,
  resizeRectWithRatio,
  parseCustomRatio,
  computeExportSize,
  initialCropRect,
} from './img-crop'

describe('clampRectToBounds', () => {
  it('leaves an in-bounds rect unchanged', () => {
    expect(clampRectToBounds({ x: 10, y: 10, width: 100, height: 100 }, 200, 200))
      .toEqual({ x: 10, y: 10, width: 100, height: 100 })
  })

  it('clamps a negative x to 0', () => {
    expect(clampRectToBounds({ x: -20, y: 10, width: 100, height: 100 }, 200, 200))
      .toEqual({ x: 0, y: 10, width: 100, height: 100 })
  })

  it('pulls x back so the rect fits inside the right edge', () => {
    expect(clampRectToBounds({ x: 150, y: 10, width: 100, height: 100 }, 200, 200))
      .toEqual({ x: 100, y: 10, width: 100, height: 100 })
  })

  it('raises width/height below the minimum size', () => {
    expect(clampRectToBounds({ x: 10, y: 10, width: 5, height: 5 }, 200, 200, 10))
      .toEqual({ x: 10, y: 10, width: 10, height: 10 })
  })

  it('caps width/height to the image bounds', () => {
    expect(clampRectToBounds({ x: 0, y: 0, width: 300, height: 300 }, 200, 200))
      .toEqual({ x: 0, y: 0, width: 200, height: 200 })
  })

  it('defaults minSize to MIN_CROP_SIZE', () => {
    const r = clampRectToBounds({ x: 0, y: 0, width: 1, height: 1 }, 200, 200)
    expect(r.width).toBe(MIN_CROP_SIZE)
    expect(r.height).toBe(MIN_CROP_SIZE)
  })
})

describe('moveRect', () => {
  it('translates by dx/dy within bounds', () => {
    expect(moveRect({ x: 10, y: 10, width: 50, height: 50 }, 5, -5, 200, 200))
      .toEqual({ x: 15, y: 5, width: 50, height: 50 })
  })

  it('clamps so the box cannot move past the left/top edge', () => {
    expect(moveRect({ x: 10, y: 10, width: 50, height: 50 }, -50, -50, 200, 200))
      .toEqual({ x: 0, y: 0, width: 50, height: 50 })
  })

  it('clamps so the box cannot move past the right/bottom edge', () => {
    expect(moveRect({ x: 100, y: 100, width: 50, height: 50 }, 100, 100, 200, 200))
      .toEqual({ x: 150, y: 150, width: 50, height: 50 })
  })
})

describe('resizeRect (free mode)', () => {
  it('grows from the se handle without moving x/y', () => {
    expect(resizeRect({ x: 10, y: 10, width: 50, height: 50 }, 'se', 20, 30))
      .toEqual({ x: 10, y: 10, width: 70, height: 80 })
  })

  it('grows from the nw handle by moving x/y and increasing size', () => {
    expect(resizeRect({ x: 10, y: 10, width: 50, height: 50 }, 'nw', -20, -30))
      .toEqual({ x: -10, y: -20, width: 70, height: 80 })
  })

  it('resizes only width from the e handle', () => {
    expect(resizeRect({ x: 10, y: 10, width: 50, height: 50 }, 'e', 20, 999))
      .toEqual({ x: 10, y: 10, width: 70, height: 50 })
  })

  it('resizes only height from the s handle', () => {
    expect(resizeRect({ x: 10, y: 10, width: 50, height: 50 }, 's', 999, 20))
      .toEqual({ x: 10, y: 10, width: 50, height: 70 })
  })
})

describe('enforceAspectRatio', () => {
  const rect = { x: 10, y: 20, width: 100, height: 80 }

  it('anchor top-left keeps x/y fixed, derives height from newWidth', () => {
    expect(enforceAspectRatio(rect, 140, 2, 'top-left'))
      .toEqual({ x: 10, y: 20, width: 140, height: 70 })
  })

  it('anchor top-right keeps the right edge fixed', () => {
    expect(enforceAspectRatio(rect, 140, 2, 'top-right'))
      .toEqual({ x: -30, y: 20, width: 140, height: 70 })
  })

  it('anchor bottom-left keeps the bottom edge fixed', () => {
    expect(enforceAspectRatio(rect, 140, 2, 'bottom-left'))
      .toEqual({ x: 10, y: 30, width: 140, height: 70 })
  })

  it('anchor bottom-right keeps the bottom-right corner fixed', () => {
    expect(enforceAspectRatio(rect, 140, 2, 'bottom-right'))
      .toEqual({ x: -30, y: 30, width: 140, height: 70 })
  })
})

describe('resizeRectWithRatio', () => {
  const rect = { x: 10, y: 20, width: 100, height: 50 }

  it('se handle grows width by +dx and derives height from ratio', () => {
    expect(resizeRectWithRatio(rect, 'se', 2, 40))
      .toEqual({ x: 10, y: 20, width: 140, height: 70 })
  })

  it('sw handle grows width by -dx (dragging left grows it) and shifts x', () => {
    expect(resizeRectWithRatio(rect, 'sw', 2, -40))
      .toEqual({ x: -30, y: 20, width: 140, height: 70 })
  })
})

describe('parseCustomRatio', () => {
  it('parses a simple integer ratio', () => {
    expect(parseCustomRatio('4:3')).toBeCloseTo(4 / 3)
  })

  it('parses a 1:1 ratio', () => {
    expect(parseCustomRatio('1:1')).toBe(1)
  })

  it('trims surrounding whitespace around the colon', () => {
    expect(parseCustomRatio(' 16 : 9 ')).toBeCloseTo(16 / 9)
  })

  it('returns null for a zero component', () => {
    expect(parseCustomRatio('0:5')).toBeNull()
  })

  it('returns null for a negative component', () => {
    expect(parseCustomRatio('-1:2')).toBeNull()
  })

  it('returns null for non-numeric input', () => {
    expect(parseCustomRatio('abc')).toBeNull()
  })

  it('returns null when missing the colon', () => {
    expect(parseCustomRatio('43')).toBeNull()
  })
})

describe('computeExportSize', () => {
  const rect = { x: 0, y: 0, width: 320.4, height: 240.6 }

  it('returns the fixed target size in fixed mode', () => {
    expect(computeExportSize(rect, 'fixed', { width: 800, height: 600 }))
      .toEqual({ width: 800, height: 600 })
  })

  it('returns the rounded rect size in free mode', () => {
    expect(computeExportSize(rect, 'free', null)).toEqual({ width: 320, height: 241 })
  })

  it('returns the rounded rect size in aspect mode', () => {
    expect(computeExportSize(rect, 'aspect', null)).toEqual({ width: 320, height: 241 })
  })
})

describe('initialCropRect', () => {
  it('centers an 80% box with no ratio constraint', () => {
    expect(initialCropRect(1000, 500, null))
      .toEqual({ x: 100, y: 50, width: 800, height: 400 })
  })

  it('fits an 80%-wide box to a ratio when height allows it', () => {
    // 1000x1000 image, ratio 2:1 -> width=800, height=400, both within 80% bounds
    expect(initialCropRect(1000, 1000, 2))
      .toEqual({ x: 100, y: 300, width: 800, height: 400 })
  })

  it('shrinks to fit height when the ratio box would exceed 80% height', () => {
    // 1000x400 image, ratio 1:1 -> width=800 would need height=800 (too tall),
    // so height is capped to 80%*400=320 and width derives from ratio: 320
    expect(initialCropRect(1000, 400, 1))
      .toEqual({ x: 340, y: 40, width: 320, height: 320 })
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test:run -- img-crop`
Expected: FAIL with "Failed to resolve import ./img-crop" or "is not a function" (the file doesn't exist yet)

- [ ] **Step 3: Implement the pure functions**

Create `src/lib/tools/img-crop.ts`:

```ts
export interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

export type CropMode = 'free' | 'aspect' | 'fixed'
export type Anchor = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
export type Handle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

export const MIN_CROP_SIZE = 10

export function clampRectToBounds(
  rect: CropRect,
  imgWidth: number,
  imgHeight: number,
  minSize: number = MIN_CROP_SIZE,
): CropRect {
  const width = Math.min(Math.max(rect.width, minSize), imgWidth)
  const height = Math.min(Math.max(rect.height, minSize), imgHeight)
  const x = Math.min(Math.max(rect.x, 0), imgWidth - width)
  const y = Math.min(Math.max(rect.y, 0), imgHeight - height)
  return { x, y, width, height }
}

export function moveRect(
  rect: CropRect,
  dx: number,
  dy: number,
  imgWidth: number,
  imgHeight: number,
): CropRect {
  const x = Math.min(Math.max(rect.x + dx, 0), imgWidth - rect.width)
  const y = Math.min(Math.max(rect.y + dy, 0), imgHeight - rect.height)
  return { ...rect, x, y }
}

export function resizeRect(rect: CropRect, handle: Handle, dx: number, dy: number): CropRect {
  let { x, y, width, height } = rect
  if (handle.includes('e')) width += dx
  if (handle.includes('w')) { width -= dx; x += dx }
  if (handle.includes('s')) height += dy
  if (handle.includes('n')) { height -= dy; y += dy }
  return { x, y, width, height }
}

export function enforceAspectRatio(
  rect: CropRect,
  newWidth: number,
  ratio: number,
  anchor: Anchor,
): CropRect {
  const newHeight = newWidth / ratio
  const right = rect.x + rect.width
  const bottom = rect.y + rect.height
  const x = anchor === 'top-right' || anchor === 'bottom-right' ? right - newWidth : rect.x
  const y = anchor === 'bottom-left' || anchor === 'bottom-right' ? bottom - newHeight : rect.y
  return { x, y, width: newWidth, height: newHeight }
}

const LOCKED_HANDLE_ANCHOR: Record<'ne' | 'nw' | 'se' | 'sw', Anchor> = {
  se: 'top-left',
  sw: 'top-right',
  ne: 'bottom-left',
  nw: 'bottom-right',
}

export function resizeRectWithRatio(
  rect: CropRect,
  handle: 'ne' | 'nw' | 'se' | 'sw',
  ratio: number,
  dx: number,
): CropRect {
  const sign = handle === 'ne' || handle === 'se' ? 1 : -1
  const newWidth = rect.width + sign * dx
  return enforceAspectRatio(rect, newWidth, ratio, LOCKED_HANDLE_ANCHOR[handle])
}

export function parseCustomRatio(input: string): number | null {
  const match = input.trim().match(/^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/)
  if (!match) return null
  const w = Number(match[1])
  const h = Number(match[2])
  if (!(w > 0) || !(h > 0)) return null
  return w / h
}

export function computeExportSize(
  rect: CropRect,
  mode: CropMode,
  fixedSize: { width: number; height: number } | null,
): { width: number; height: number } {
  if (mode === 'fixed' && fixedSize) {
    return { width: fixedSize.width, height: fixedSize.height }
  }
  return { width: Math.round(rect.width), height: Math.round(rect.height) }
}

export function initialCropRect(imgWidth: number, imgHeight: number, ratio: number | null): CropRect {
  if (ratio == null) {
    const width = imgWidth * 0.8
    const height = imgHeight * 0.8
    return clampRectToBounds(
      { x: (imgWidth - width) / 2, y: (imgHeight - height) / 2, width, height },
      imgWidth,
      imgHeight,
    )
  }

  let width = imgWidth * 0.8
  let height = width / ratio
  if (height > imgHeight * 0.8) {
    height = imgHeight * 0.8
    width = height * ratio
  }
  return clampRectToBounds(
    { x: (imgWidth - width) / 2, y: (imgHeight - height) / 2, width, height },
    imgWidth,
    imgHeight,
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test:run -- img-crop`
Expected: PASS (all cases in `img-crop.test.ts` green)

- [ ] **Step 5: Commit**

```bash
git add src/lib/tools/img-crop.ts src/lib/tools/img-crop.test.ts
git commit -m "$(cat <<'EOF'
feat(img-crop): add pure crop-rect and aspect-ratio math

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Canvas crop/resize + `cropAndEncode` orchestration

**Files:**
- Modify: `src/lib/tools/img-crop.ts` (append)

**Interfaces:**
- Consumes: `encodeImageData` from `./img-compress` (Task 1); `CropRect`, `CropMode`, `computeExportSize` from Task 2.
- Produces (consumed by Task 6): `loadImageBitmap(file: File): Promise<ImageBitmap>`, `cropAndEncode(bitmap: ImageBitmap, rect: CropRect, mode: CropMode, fixedSize: { width: number; height: number } | null, opts: CompressOptions): Promise<CompressResult>`.

Not unit-tested: `OffscreenCanvas`/`getContext('2d')` drawing is not exercised in the `happy-dom` test environment, matching the existing convention in `img-compress.ts` (its canvas-dependent `fileToImageData`/`compressImage` are likewise untested; only pure helpers are).

- [ ] **Step 1: Append the canvas + orchestration code**

Add to the end of `src/lib/tools/img-crop.ts`:

```ts
import { encodeImageData, type CompressOptions, type CompressResult } from './img-compress'

export async function loadImageBitmap(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file)
}

export function extractCrop(bitmap: ImageBitmap, rect: CropRect): ImageData {
  const width = Math.round(rect.width)
  const height = Math.round(rect.height)
  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, rect.x, rect.y, rect.width, rect.height, 0, 0, width, height)
  return ctx.getImageData(0, 0, width, height)
}

export function resizeImageData(data: ImageData, targetWidth: number, targetHeight: number): ImageData {
  const src = new OffscreenCanvas(data.width, data.height)
  src.getContext('2d')!.putImageData(data, 0, 0)

  const dst = new OffscreenCanvas(targetWidth, targetHeight)
  const dctx = dst.getContext('2d')!
  dctx.drawImage(src, 0, 0, data.width, data.height, 0, 0, targetWidth, targetHeight)
  return dctx.getImageData(0, 0, targetWidth, targetHeight)
}

export async function cropAndEncode(
  bitmap: ImageBitmap,
  rect: CropRect,
  mode: CropMode,
  fixedSize: { width: number; height: number } | null,
  opts: CompressOptions,
): Promise<CompressResult> {
  const cropped = extractCrop(bitmap, rect)
  const target = computeExportSize(rect, mode, fixedSize)
  const finalData =
    mode === 'fixed' && fixedSize && (target.width !== cropped.width || target.height !== cropped.height)
      ? resizeImageData(cropped, target.width, target.height)
      : cropped
  return encodeImageData(finalData, target.width, target.height, opts)
}
```

Move the `import { encodeImageData, ... } from './img-compress'` line to the top of the file (alongside the existing type-only imports already present from Task 2 — there are none yet, so this becomes the file's first import line).

- [ ] **Step 2: Run the full test suite to confirm nothing broke**

Run: `pnpm test:run`
Expected: PASS (img-crop.test.ts unaffected, since these new exports aren't imported by it)

- [ ] **Step 3: Run the build to confirm the new code type-checks**

Run: `pnpm build`
Expected: exits 0

- [ ] **Step 4: Commit**

```bash
git add src/lib/tools/img-crop.ts
git commit -m "$(cat <<'EOF'
feat(img-crop): add canvas crop/resize and cropAndEncode

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Extract `CompressSettingsPanel` and update `ImgCompressPage`

**Files:**
- Create: `src/components/tools/CompressSettingsPanel.tsx`
- Modify: `src/pages/ImgCompressPage.tsx`

**Interfaces:**
- Produces (consumed by Task 6): `CompressSettingsPanel` component with props:
  ```ts
  interface CompressSettingsPanelProps {
    inputFormat: InputFormat | null
    outputFormat: OutputFormat
    quality: number
    lossless: boolean
    onFormatChange: (fmt: OutputFormat) => void
    onQualityChange: (quality: number) => void
    onLosslessChange: (checked: boolean) => void
  }
  ```
  `onFormatChange` is only called when the target format is not disabled (the panel itself checks `isFormatDisabled`); the caller does not need to re-check it.

This is a behavior-preserving UI refactor — no new test file (React components aren't unit-tested per project convention). Correctness is verified by running the existing test suite (unaffected) and a full build, then a manual smoke check.

- [ ] **Step 1: Create the shared settings panel**

Create `src/components/tools/CompressSettingsPanel.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { InputFormat, OutputFormat } from '@/lib/tools/img-compress'

interface CompressSettingsPanelProps {
  inputFormat: InputFormat | null
  outputFormat: OutputFormat
  quality: number
  lossless: boolean
  onFormatChange: (fmt: OutputFormat) => void
  onQualityChange: (quality: number) => void
  onLosslessChange: (checked: boolean) => void
}

function showQualitySlider(outputFormat: OutputFormat, lossless: boolean): boolean {
  if (outputFormat === 'jpeg') return true
  if (outputFormat === 'png') return false
  return !lossless
}

function isFormatDisabled(fmt: OutputFormat, lossless: boolean): boolean {
  return lossless && fmt === 'jpeg'
}

export function CompressSettingsPanel({
  inputFormat,
  outputFormat,
  quality,
  lossless,
  onFormatChange,
  onQualityChange,
  onLosslessChange,
}: CompressSettingsPanelProps) {
  const { t } = useTranslation('tools')

  const formats: { id: OutputFormat; label: string; sub: string; tag: 'lossy' | 'lossless' | 'both' }[] = [
    { id: 'jpeg', label: 'JPEG', sub: t('img-compress.codecJpeg'), tag: 'lossy' },
    { id: 'png', label: 'PNG', sub: t('img-compress.codecPng'), tag: 'lossless' },
    { id: 'webp', label: 'WebP', sub: t('img-compress.codecWebp'), tag: lossless ? 'lossless' : 'both' },
  ]

  const tagClass = {
    lossy: 'bg-orange-500/10 text-orange-500',
    lossless: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    both: 'bg-blue-500/10 text-blue-500',
  }
  const tagLabel = {
    lossy: t('img-compress.tagLossy'),
    lossless: t('img-compress.tagLossless'),
    both: t('img-compress.tagBoth'),
  }

  const qualityVisible = inputFormat != null && showQualitySlider(outputFormat, lossless)

  return (
    <>
      {/* Lossless toggle */}
      <div className="border-b px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Label htmlFor="lossless-toggle" className="text-sm font-medium cursor-pointer">
              {t('img-compress.lossless')}
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">{t('img-compress.losslessDesc')}</p>
          </div>
          <Checkbox
            id="lossless-toggle"
            checked={lossless}
            onCheckedChange={(v) => onLosslessChange(v === true)}
          />
        </div>
      </div>

      {/* Format selection */}
      <div className="border-b px-4 py-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {t('img-compress.outputFormat')}
        </p>
        <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label={t('img-compress.outputFormat')}>
          {formats.map((fmt) => {
            const disabled = isFormatDisabled(fmt.id, lossless)
            const selected = outputFormat === fmt.id
            return (
              <button
                key={fmt.id}
                role="radio"
                aria-checked={selected}
                aria-disabled={disabled}
                tabIndex={disabled ? -1 : 0}
                disabled={disabled}
                onClick={() => { if (!disabled) onFormatChange(fmt.id) }}
                className={cn(
                  'relative rounded-lg border px-2.5 py-2 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  selected && !disabled
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-card/60 hover:border-border/80',
                  disabled && 'opacity-35 cursor-not-allowed',
                )}
              >
                <div className="flex flex-wrap items-center gap-1 mb-0.5">
                  <span className={cn(
                    'h-1.5 w-1.5 flex-shrink-0 rounded-full transition-opacity',
                    selected && !disabled ? 'bg-primary opacity-100' : 'opacity-0',
                  )} />
                  <span className="text-xs font-semibold leading-none">{fmt.label}</span>
                  <span className={cn('rounded px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide', tagClass[fmt.tag])}>
                    {tagLabel[fmt.tag]}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground pl-3">{fmt.sub}</p>
                {disabled && (
                  <p className="mt-0.5 text-[9px] text-destructive/70 pl-3 leading-snug">
                    {t('img-compress.jpegNotLossless')}
                  </p>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Quality slider */}
      <div className={cn('border-b px-4 py-3 transition-opacity', !qualityVisible && 'opacity-30 pointer-events-none')}>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs font-medium">{t('img-compress.quality')}</Label>
          <span className="font-mono text-xs font-semibold text-primary tabular-nums">
            {qualityVisible ? quality : '—'}
          </span>
        </div>
        <Slider
          min={1}
          max={100}
          step={1}
          value={[quality]}
          onValueChange={([v]) => onQualityChange(v)}
          disabled={!qualityVisible}
          className="w-full"
        />
        <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
          <span>{t('img-compress.smallerFile')}</span>
          <span>{t('img-compress.betterQuality')}</span>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Update `ImgCompressPage.tsx` to use it**

In `src/pages/ImgCompressPage.tsx`:

1. Remove the now-unused imports `Slider` (line 6) and `Checkbox` (line 7) — `Label` is also no longer used directly, remove it too. Add:
   ```ts
   import { CompressSettingsPanel } from '@/components/tools/CompressSettingsPanel'
   ```

2. Delete the top-level `showQualitySlider` and `isFormatDisabled` functions (lines 25-33) — they now live in `CompressSettingsPanel.tsx`.

3. Simplify `handleFormatSelect` (the panel already guards against disabled formats, so drop the guard here):
   ```ts
   function handleFormatSelect(fmt: OutputFormat) {
     setOutputFormat(fmt)
     setResult(null)
     setCompressedUrl(null)
     if (tab === 'compressed') setTab('original')
   }
   ```

4. Add a `handleQualityChange` function next to `handleFormatSelect`:
   ```ts
   function handleQualityChange(v: number) {
     setQuality(v)
     setResult(null)
     setCompressedUrl(null)
   }
   ```

5. Delete the `qualityVisible` computed variable (it now lives inside `CompressSettingsPanel`) and the `formats`/`tagClass`/`tagLabel` local declarations (previously right before the "Settings panel" JSX block).

6. Replace the entire "Settings panel" `<div>` (from `{/* ── Settings panel ── */}` through the closing of the quality slider block, right before `{/* Actions */}`) with:
   ```tsx
   {/* ── Settings panel ── */}
   <div className="flex flex-col rounded-xl border bg-card overflow-hidden">
     <CompressSettingsPanel
       inputFormat={inputFormat}
       outputFormat={outputFormat}
       quality={quality}
       lossless={lossless}
       onFormatChange={handleFormatSelect}
       onQualityChange={handleQualityChange}
       onLosslessChange={handleLosslessChange}
     />

     {/* Actions */}
   ```
   (the existing Actions `<div>` and its contents, and the two closing `</div>` tags after it, stay exactly as they are)

- [ ] **Step 3: Run the existing test suite**

Run: `pnpm test:run -- img-compress`
Expected: PASS (unchanged — this file has no component tests, but confirms `img-compress.ts` itself is untouched)

- [ ] **Step 4: Run the build**

Run: `pnpm build`
Expected: exits 0 (this is the primary regression check for this task, since it type-checks every prop wired between `ImgCompressPage` and `CompressSettingsPanel`)

- [ ] **Step 5: Manual smoke check**

Run: `pnpm dev`, open `/image/compress`, upload a JPEG, confirm: format buttons switch, lossless toggle disables JPEG, quality slider drags, Compress + Download still work exactly as before. Check dark mode too.

- [ ] **Step 6: Commit**

```bash
git add src/components/tools/CompressSettingsPanel.tsx src/pages/ImgCompressPage.tsx
git commit -m "$(cat <<'EOF'
refactor(image): extract CompressSettingsPanel for reuse

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: `ImageCropCanvas` interactive component

**Files:**
- Create: `src/components/tools/ImageCropCanvas.tsx`

**Interfaces:**
- Consumes: `CropRect`, `Handle`, `clampRectToBounds`, `moveRect`, `resizeRect`, `resizeRectWithRatio` from `@/lib/tools/img-crop` (Task 2).
- Produces (consumed by Task 6):
  ```ts
  interface ImageCropCanvasProps {
    imageUrl: string
    naturalWidth: number
    naturalHeight: number
    rect: CropRect
    ratio: number | null
    onChange: (rect: CropRect) => void
  }
  ```

Not unit-tested (interactive component, no test needed per project convention). When `ratio` is non-null, only the 4 corner handles are shown and dragging them keeps the ratio locked via `resizeRectWithRatio`; edge handles are only meaningful in free mode, where each resizes one dimension independently.

- [ ] **Step 1: Create the component**

Create `src/components/tools/ImageCropCanvas.tsx`:

```tsx
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { cn } from '@/lib/utils'
import {
  clampRectToBounds,
  moveRect,
  resizeRect,
  resizeRectWithRatio,
  type CropRect,
  type Handle,
} from '@/lib/tools/img-crop'

interface ImageCropCanvasProps {
  imageUrl: string
  naturalWidth: number
  naturalHeight: number
  rect: CropRect
  ratio: number | null
  onChange: (rect: CropRect) => void
}

const ALL_HANDLES: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
const LOCKED_HANDLES: ('nw' | 'ne' | 'se' | 'sw')[] = ['nw', 'ne', 'se', 'sw']

const HANDLE_POSITION: Record<Handle, string> = {
  nw: 'top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize',
  n: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize',
  ne: 'top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize',
  e: 'top-1/2 right-0 translate-x-1/2 -translate-y-1/2 cursor-ew-resize',
  se: 'bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize',
  s: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-ns-resize',
  sw: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize',
  w: 'top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize',
}

type DragState =
  | { kind: 'move'; startX: number; startY: number; startRect: CropRect }
  | { kind: 'resize'; handle: Handle; startX: number; startY: number; startRect: CropRect }

export function ImageCropCanvas({ imageUrl, naturalWidth, naturalHeight, rect, ratio, onChange }: ImageCropCanvasProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const [scale, setScale] = useState(1)

  const measure = useCallback(() => {
    const el = imgRef.current
    if (!el || naturalWidth === 0) return
    setScale(el.clientWidth / naturalWidth)
  }, [naturalWidth])

  useEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])

  const handlePointerMove = useCallback((e: PointerEvent) => {
    const drag = dragRef.current
    if (!drag || scale === 0) return
    const dx = (e.clientX - drag.startX) / scale
    const dy = (e.clientY - drag.startY) / scale

    let next: CropRect
    if (drag.kind === 'move') {
      next = moveRect(drag.startRect, dx, dy, naturalWidth, naturalHeight)
    } else if (ratio != null && (LOCKED_HANDLES as Handle[]).includes(drag.handle)) {
      next = resizeRectWithRatio(drag.startRect, drag.handle as 'nw' | 'ne' | 'se' | 'sw', ratio, dx)
    } else {
      next = resizeRect(drag.startRect, drag.handle, dx, dy)
    }
    onChange(clampRectToBounds(next, naturalWidth, naturalHeight))
  }, [scale, ratio, naturalWidth, naturalHeight, onChange])

  const handlePointerUp = useCallback(() => {
    dragRef.current = null
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerUp)
  }, [handlePointerMove])

  function startDrag(e: ReactPointerEvent, drag: DragState) {
    e.preventDefault()
    e.stopPropagation()
    dragRef.current = drag
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  const visibleHandles = ratio != null ? LOCKED_HANDLES : ALL_HANDLES

  return (
    <div className="relative inline-block max-w-full select-none">
      <img
        ref={imgRef}
        src={imageUrl}
        alt=""
        className="block max-w-full h-auto"
        onLoad={measure}
        draggable={false}
      />
      <div
        className="absolute cursor-move border-2 border-primary"
        style={{
          left: rect.x * scale,
          top: rect.y * scale,
          width: rect.width * scale,
          height: rect.height * scale,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
        }}
        onPointerDown={(e) => startDrag(e, { kind: 'move', startX: e.clientX, startY: e.clientY, startRect: rect })}
      >
        {visibleHandles.map((handle) => (
          <div
            key={handle}
            className={cn('absolute h-3 w-3 rounded-full border-2 border-primary bg-background', HANDLE_POSITION[handle])}
            onPointerDown={(e) => startDrag(e, { kind: 'resize', handle, startX: e.clientX, startY: e.clientY, startRect: rect })}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run the build**

Run: `pnpm build`
Expected: exits 0 (type-checks the component; it isn't wired into a page yet so nothing renders it, but `tsc -b` still validates it)

- [ ] **Step 3: Commit**

```bash
git add src/components/tools/ImageCropCanvas.tsx
git commit -m "$(cat <<'EOF'
feat(image): add interactive crop-box canvas component

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: `ImgCropPage.tsx`

**Files:**
- Create: `src/pages/ImgCropPage.tsx`

**Interfaces:**
- Consumes: everything from Tasks 1-5 — `detectFormat`, `formatBytes`, `buildOutputFilename`, `type InputFormat/OutputFormat/CompressResult` from `@/lib/tools/img-compress`; `CropRect`, `CropMode`, `loadImageBitmap`, `cropAndEncode`, `initialCropRect`, `parseCustomRatio` from `@/lib/tools/img-crop`; `CompressSettingsPanel`; `ImageCropCanvas`.
- Produces: `export function ImgCropPage()`, consumed by Task 8's route registration.
- Exposes tool id `img-crop` to `ToolLayout` (must match the i18n namespace key added in Task 7).

- [ ] **Step 1: Create the page**

Create `src/pages/ImgCropPage.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, ImageOff, Loader2, Upload, X } from 'lucide-react'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Button } from '@/components/ui/button'
import { CompressSettingsPanel } from '@/components/tools/CompressSettingsPanel'
import { ImageCropCanvas } from '@/components/tools/ImageCropCanvas'
import { cn } from '@/lib/utils'
import {
  buildOutputFilename,
  detectFormat,
  formatBytes,
  preloadCodecs,
  type CompressResult,
  type InputFormat,
  type OutputFormat,
} from '@/lib/tools/img-compress'
import {
  cropAndEncode,
  initialCropRect,
  loadImageBitmap,
  parseCustomRatio,
  type CropMode,
  type CropRect,
} from '@/lib/tools/img-crop'

const MAX_BYTES = 20 * 1024 * 1024

const PRESETS: { label: string; value: number }[] = [
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:2', value: 3 / 2 },
  { label: '16:9', value: 16 / 9 },
  { label: '9:16', value: 9 / 16 },
]

const MODE_LABEL_KEY: Record<CropMode, string> = {
  free: 'img-crop.modeFree',
  aspect: 'img-crop.modeAspect',
  fixed: 'img-crop.modeFixed',
}

export function ImgCropPage() {
  const { t } = useTranslation('tools')
  const inputRef = useRef<HTMLInputElement>(null)
  const objectUrlsRef = useRef<string[]>([])
  const bitmapRef = useRef<ImageBitmap | null>(null)

  const [dragOver, setDragOver] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [inputFormat, setInputFormat] = useState<InputFormat | null>(null)
  const [originalUrl, setOriginalUrl] = useState<string | null>(null)
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null)

  const [mode, setMode] = useState<CropMode>('free')
  const [presetRatio, setPresetRatio] = useState(1)
  const [customRatioInput, setCustomRatioInput] = useState('')
  const [fixedWidth, setFixedWidth] = useState(800)
  const [fixedHeight, setFixedHeight] = useState(600)
  const [rect, setRect] = useState<CropRect | null>(null)

  const [outputFormat, setOutputFormat] = useState<OutputFormat>('jpeg')
  const [quality, setQuality] = useState(85)
  const [lossless, setLossless] = useState(false)

  const [view, setView] = useState<'edit' | 'result'>('edit')
  const [resultTab, setResultTab] = useState<'original' | 'cropped'>('cropped')
  const [cropping, setCropping] = useState(false)
  const [result, setResult] = useState<CompressResult | null>(null)
  const [croppedUrl, setCroppedUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    preloadCodecs().catch(() => {})
  }, [])

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach(URL.revokeObjectURL)
      bitmapRef.current?.close()
    }
  }, [])

  function makeObjectUrl(blob: Blob | File): string {
    const url = URL.createObjectURL(blob)
    objectUrlsRef.current.push(url)
    return url
  }

  const effectiveRatio =
    mode === 'aspect' ? presetRatio : mode === 'fixed' ? (fixedWidth > 0 && fixedHeight > 0 ? fixedWidth / fixedHeight : null) : null

  const validFixedSize = Number.isInteger(fixedWidth) && Number.isInteger(fixedHeight) && fixedWidth > 0 && fixedHeight > 0

  async function accept(f: File) {
    const fmt = detectFormat(f)
    if (!fmt) { setError(t('img-crop.errorFormat')); return }
    if (f.size > MAX_BYTES) { setError(t('img-crop.errorSize')); return }

    objectUrlsRef.current.forEach(URL.revokeObjectURL)
    objectUrlsRef.current = []
    bitmapRef.current?.close()

    const bitmap = await loadImageBitmap(f)
    bitmapRef.current = bitmap

    setFile(f)
    setInputFormat(fmt)
    setOriginalUrl(makeObjectUrl(f))
    setNaturalSize({ w: bitmap.width, h: bitmap.height })
    setMode('free')
    setRect(initialCropRect(bitmap.width, bitmap.height, null))
    setResult(null)
    setCroppedUrl(null)
    setError(null)
    setView('edit')
    setOutputFormat(fmt)
  }

  function handleFiles(list: FileList | null) {
    if (!list || list.length === 0) return
    accept(list[0])
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  function handleModeChange(next: CropMode) {
    if (!naturalSize) return
    setMode(next)
    const ratio = next === 'aspect' ? presetRatio : next === 'fixed' ? (validFixedSize ? fixedWidth / fixedHeight : null) : null
    setRect(initialCropRect(naturalSize.w, naturalSize.h, ratio))
  }

  function handlePresetSelect(value: number) {
    setPresetRatio(value)
    setCustomRatioInput('')
    if (naturalSize) setRect(initialCropRect(naturalSize.w, naturalSize.h, value))
  }

  function handleCustomRatioChange(input: string) {
    setCustomRatioInput(input)
    const parsed = parseCustomRatio(input)
    if (parsed != null) {
      setPresetRatio(parsed)
      if (naturalSize) setRect(initialCropRect(naturalSize.w, naturalSize.h, parsed))
    }
  }

  function handleFixedSizeChange(w: number, h: number) {
    setFixedWidth(w)
    setFixedHeight(h)
    if (naturalSize && Number.isInteger(w) && Number.isInteger(h) && w > 0 && h > 0) {
      setRect(initialCropRect(naturalSize.w, naturalSize.h, w / h))
    }
  }

  function handleFormatSelect(fmt: OutputFormat) {
    setOutputFormat(fmt)
  }

  function handleLosslessChange(checked: boolean) {
    setLossless(checked)
    if (checked && outputFormat !== 'png' && outputFormat !== 'webp') {
      setOutputFormat('png')
    }
  }

  async function handleCrop() {
    if (!file || !rect || !bitmapRef.current || cropping) return
    if (mode === 'fixed' && !validFixedSize) return

    setCropping(true)
    setError(null)
    try {
      const fixedSize = mode === 'fixed' ? { width: fixedWidth, height: fixedHeight } : null
      const r = await cropAndEncode(bitmapRef.current, rect, mode, fixedSize, { outputFormat, quality, lossless })
      const blob = new Blob([r.buffer], { type: r.mimeType })
      const url = makeObjectUrl(blob)
      setResult(r)
      setCroppedUrl(url)
      setResultTab('cropped')
      setView('result')
    } catch {
      setError(t('img-crop.errorFailed'))
    } finally {
      setCropping(false)
    }
  }

  function handleDownload() {
    if (!result || !croppedUrl || !file) return
    const a = document.createElement('a')
    a.href = croppedUrl
    a.download = buildOutputFilename(file.name, result.extension)
    a.click()
  }

  function handleRecrop() {
    setView('edit')
  }

  function handleReset() {
    objectUrlsRef.current.forEach(URL.revokeObjectURL)
    objectUrlsRef.current = []
    bitmapRef.current?.close()
    bitmapRef.current = null
    setFile(null)
    setInputFormat(null)
    setOriginalUrl(null)
    setNaturalSize(null)
    setRect(null)
    setResult(null)
    setCroppedUrl(null)
    setError(null)
    setView('edit')
  }

  if (!file) {
    return (
      <ToolLayout toolId="img-crop" category="Image">
        <div
          role="button"
          tabIndex={0}
          aria-label={t('img-crop.drop')}
          className={cn(
            'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-8 py-16 text-center cursor-pointer transition-colors select-none',
            dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/60 hover:bg-muted/40',
          )}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click() } }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <div className="rounded-xl bg-muted p-3 text-muted-foreground">
            <Upload className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {dragOver ? t('img-crop.dragActive') : t('img-crop.drop')}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{t('img-crop.dropHint')}</p>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </ToolLayout>
    )
  }

  return (
    <ToolLayout toolId="img-crop" category="Image">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {view === 'edit' ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_272px]">
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="flex items-center justify-between border-b px-4 py-2.5">
              <div className="flex gap-1" role="tablist">
                {(['free', 'aspect', 'fixed'] as CropMode[]).map((m) => (
                  <button
                    key={m}
                    role="tab"
                    aria-selected={mode === m}
                    onClick={() => handleModeChange(m)}
                    className={cn(
                      'rounded px-3 py-1 text-xs font-medium transition-colors',
                      mode === m ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {t(MODE_LABEL_KEY[m])}
                  </button>
                ))}
              </div>
              <span className="font-mono text-xs text-muted-foreground truncate max-w-[180px]">{file.name}</span>
            </div>

            {mode === 'aspect' && (
              <div className="flex flex-wrap items-center gap-1.5 border-b px-4 py-2.5">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => handlePresetSelect(p.value)}
                    className={cn(
                      'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                      presetRatio === p.value && !customRatioInput
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border text-muted-foreground hover:border-border/80',
                    )}
                  >
                    {p.label}
                  </button>
                ))}
                <input
                  type="text"
                  value={customRatioInput}
                  onChange={(e) => handleCustomRatioChange(e.target.value)}
                  placeholder={t('img-crop.customRatioPlaceholder')}
                  className="w-24 rounded-md border border-border bg-transparent px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            )}

            {mode === 'fixed' && (
              <div className="flex items-center gap-2 border-b px-4 py-2.5">
                <label className="text-xs text-muted-foreground">{t('img-crop.widthLabel')}</label>
                <input
                  type="number"
                  min={1}
                  value={fixedWidth}
                  onChange={(e) => handleFixedSizeChange(Number(e.target.value), fixedHeight)}
                  className="w-20 rounded-md border border-border bg-transparent px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <span className="text-xs text-muted-foreground">×</span>
                <label className="text-xs text-muted-foreground">{t('img-crop.heightLabel')}</label>
                <input
                  type="number"
                  min={1}
                  value={fixedHeight}
                  onChange={(e) => handleFixedSizeChange(fixedWidth, Number(e.target.value))}
                  className="w-20 rounded-md border border-border bg-transparent px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <span className="text-xs text-muted-foreground">{t('img-crop.pixelsUnit')}</span>
              </div>
            )}

            <div className="flex min-h-[240px] items-center justify-center bg-[repeating-conic-gradient(hsl(var(--muted))_0%_25%,hsl(var(--background))_0%_50%)] bg-[length:16px_16px] p-4">
              {originalUrl && naturalSize && rect && (
                <ImageCropCanvas
                  imageUrl={originalUrl}
                  naturalWidth={naturalSize.w}
                  naturalHeight={naturalSize.h}
                  rect={rect}
                  ratio={effectiveRatio}
                  onChange={setRect}
                />
              )}
            </div>
          </div>

          <div className="flex flex-col rounded-xl border bg-card overflow-hidden">
            <CompressSettingsPanel
              inputFormat={inputFormat}
              outputFormat={outputFormat}
              quality={quality}
              lossless={lossless}
              onFormatChange={handleFormatSelect}
              onQualityChange={setQuality}
              onLosslessChange={handleLosslessChange}
            />

            <div className="flex flex-col gap-2 p-4">
              {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
              {mode === 'fixed' && !validFixedSize && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{t('img-crop.invalidSize')}</p>
              )}
              <Button onClick={handleCrop} disabled={cropping || (mode === 'fixed' && !validFixedSize)} className="w-full">
                {cropping ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />{t('img-crop.cropping')}</>
                ) : (
                  t('img-crop.cropButton')
                )}
              </Button>
              <button
                onClick={handleReset}
                className="flex w-full items-center justify-center gap-1.5 rounded-md py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-3 w-3" />
                {t('img-crop.remove')}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <div className="flex gap-1" role="tablist">
              {(['original', 'cropped'] as const).map((tb) => (
                <button
                  key={tb}
                  role="tab"
                  aria-selected={resultTab === tb}
                  onClick={() => setResultTab(tb)}
                  className={cn(
                    'rounded px-3 py-1 text-xs font-medium transition-colors',
                    resultTab === tb ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {tb === 'original' ? t('img-crop.tabOriginal') : t('img-crop.tabCropped')}
                </button>
              ))}
            </div>
            <span className="font-mono text-xs text-muted-foreground truncate max-w-[180px]">{file.name}</span>
          </div>

          <div className="relative flex min-h-[240px] items-center justify-center bg-[repeating-conic-gradient(hsl(var(--muted))_0%_25%,hsl(var(--background))_0%_50%)] bg-[length:16px_16px]">
            {resultTab === 'original' && originalUrl ? (
              <img src={originalUrl} alt={t('img-crop.tabOriginal')} className="max-h-[320px] max-w-full object-contain" />
            ) : resultTab === 'cropped' && croppedUrl ? (
              <img src={croppedUrl} alt={t('img-crop.tabCropped')} className="max-h-[320px] max-w-full object-contain" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground/40 py-12">
                <ImageOff className="h-8 w-8" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 divide-x border-t text-center">
            <div className="px-4 py-3">
              <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{t('img-crop.tabOriginal')}</p>
              <p className="mt-0.5 font-mono text-base font-semibold tabular-nums">{formatBytes(file.size)}</p>
              {naturalSize && <p className="text-[10px] text-muted-foreground">{naturalSize.w}×{naturalSize.h}</p>}
            </div>
            <div className="flex flex-col items-center justify-center px-4 py-3">
              <p className="text-[10px] text-muted-foreground">—</p>
            </div>
            <div className="px-4 py-3 text-right">
              <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{t('img-crop.tabCropped')}</p>
              <p className="mt-0.5 font-mono text-base font-semibold tabular-nums text-emerald-500">
                {result ? formatBytes(result.buffer.byteLength) : '—'}
              </p>
              {result && <p className="text-[10px] text-muted-foreground">{result.width}×{result.height}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-2 p-4">
            <Button variant="outline" onClick={handleRecrop} className="w-full">
              {t('img-crop.recrop')}
            </Button>
            <Button onClick={handleDownload} className="w-full gap-2">
              <Download className="h-4 w-4" />
              {t('img-crop.download')}
            </Button>
            <button
              onClick={handleReset}
              className="flex w-full items-center justify-center gap-1.5 rounded-md py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-3 w-3" />
              {t('img-crop.remove')}
            </button>
          </div>
        </div>
      )}
    </ToolLayout>
  )
}
```

- [ ] **Step 2: Run the build**

Run: `pnpm build`
Expected: FAIL — `ImgCropPage` isn't registered yet, but `tsc -b` should still succeed on the file itself; the build only fails here if there's an actual type error. If it fails only because the page is unreferenced/unused, that's not an error in TS (unused exports are fine); expect exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/pages/ImgCropPage.tsx
git commit -m "$(cat <<'EOF'
feat(image): add Image Crop page

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: i18n — `img-crop` namespace in all 9 locales

**Files:**
- Modify: `src/i18n/locales/en/tools.json`
- Modify: `src/i18n/locales/zh/tools.json`
- Modify: `src/i18n/locales/de/tools.json`
- Modify: `src/i18n/locales/es/tools.json`
- Modify: `src/i18n/locales/fr/tools.json`
- Modify: `src/i18n/locales/ja/tools.json`
- Modify: `src/i18n/locales/ko/tools.json`
- Modify: `src/i18n/locales/pt/tools.json`
- Modify: `src/i18n/locales/ru/tools.json`

**Interfaces:**
- Produces: the `img-crop.*` keys read by `ToolLayout` (`img-crop.title`, `img-crop.description`) and `ImgCropPage.tsx` (all other keys listed below).

- [ ] **Step 1: Add the `img-crop` key to each locale file**

Each `tools.json` is a flat top-level object keyed by tool id (matching `img-compress`'s existing structure). Add a new `"img-crop": { ... }` entry to each file (alongside the existing `"img-compress"` entry — insert it directly after `"img-compress"` for readability).

`en`:
```json
"img-crop": {
  "title": "Image Crop",
  "description": "Crop JPEG, PNG, and WebP images locally — free-form, by aspect ratio, or to an exact pixel size — then compress and download. Nothing leaves your browser.",
  "drop": "Drop an image here, or click to browse",
  "dropHint": "Supports JPEG, PNG, WebP · Max 20 MB",
  "dragActive": "Release to upload",
  "modeFree": "Free",
  "modeAspect": "Aspect Ratio",
  "modeFixed": "Fixed Size",
  "customRatioPlaceholder": "Custom, e.g. 5:7",
  "widthLabel": "Width",
  "heightLabel": "Height",
  "pixelsUnit": "px",
  "invalidSize": "Enter a valid width and height (whole numbers greater than 0).",
  "cropButton": "Crop & Export",
  "cropping": "Cropping…",
  "remove": "Remove image",
  "tabOriginal": "Original",
  "tabCropped": "Cropped",
  "download": "Download",
  "recrop": "Re-crop",
  "errorFormat": "Unsupported format. Please upload a JPEG, PNG, or WebP file.",
  "errorSize": "File exceeds the 20 MB limit.",
  "errorFailed": "Crop failed. Please try again."
}
```

`zh`:
```json
"img-crop": {
  "title": "图片裁剪",
  "description": "在浏览器本地裁剪 JPEG、PNG、WebP 图片——自由裁剪、按比例裁剪或裁剪到精确像素尺寸，然后压缩并下载，数据不会上传。",
  "drop": "拖放图片到此处，或点击选择文件",
  "dropHint": "支持 JPEG、PNG、WebP · 最大 20 MB",
  "dragActive": "松开以上传",
  "modeFree": "自由裁剪",
  "modeAspect": "固定比例",
  "modeFixed": "固定尺寸",
  "customRatioPlaceholder": "自定义，如 5:7",
  "widthLabel": "宽度",
  "heightLabel": "高度",
  "pixelsUnit": "像素",
  "invalidSize": "请输入有效的宽度和高度（大于 0 的整数）。",
  "cropButton": "裁剪并导出",
  "cropping": "裁剪中…",
  "remove": "移除图片",
  "tabOriginal": "原图",
  "tabCropped": "裁剪后",
  "download": "下载",
  "recrop": "重新裁剪",
  "errorFormat": "不支持的格式，请上传 JPEG、PNG 或 WebP 文件。",
  "errorSize": "文件超过 20 MB 限制。",
  "errorFailed": "裁剪失败，请重试。"
}
```

`de`:
```json
"img-crop": {
  "title": "Bildzuschnitt",
  "description": "JPEG-, PNG- und WebP-Bilder lokal zuschneiden — frei, mit festem Seitenverhältnis oder auf eine exakte Pixelgröße — anschließend komprimieren und herunterladen. Keine Daten verlassen Ihren Browser.",
  "drop": "Bild hier ablegen oder klicken zum Durchsuchen",
  "dropHint": "Unterstützt JPEG, PNG, WebP · Max. 20 MB",
  "dragActive": "Loslassen zum Hochladen",
  "modeFree": "Frei",
  "modeAspect": "Seitenverhältnis",
  "modeFixed": "Feste Größe",
  "customRatioPlaceholder": "Eigenes, z. B. 5:7",
  "widthLabel": "Breite",
  "heightLabel": "Höhe",
  "pixelsUnit": "px",
  "invalidSize": "Geben Sie eine gültige Breite und Höhe ein (ganze Zahlen größer als 0).",
  "cropButton": "Zuschneiden & Exportieren",
  "cropping": "Zuschneiden…",
  "remove": "Bild entfernen",
  "tabOriginal": "Original",
  "tabCropped": "Zugeschnitten",
  "download": "Herunterladen",
  "recrop": "Neu zuschneiden",
  "errorFormat": "Nicht unterstütztes Format. Bitte JPEG-, PNG- oder WebP-Datei verwenden.",
  "errorSize": "Datei überschreitet das 20-MB-Limit.",
  "errorFailed": "Zuschneiden fehlgeschlagen. Bitte erneut versuchen."
}
```

`es`:
```json
"img-crop": {
  "title": "Recorte de imágenes",
  "description": "Recorta imágenes JPEG, PNG y WebP de forma local — libremente, con una relación de aspecto fija o a un tamaño exacto en píxeles — y luego comprime y descarga. Nada sale de tu navegador.",
  "drop": "Suelta una imagen aquí o haz clic para examinar",
  "dropHint": "Compatible con JPEG, PNG, WebP · Máx. 20 MB",
  "dragActive": "Suelta para subir",
  "modeFree": "Libre",
  "modeAspect": "Relación de aspecto",
  "modeFixed": "Tamaño fijo",
  "customRatioPlaceholder": "Personalizado, p. ej. 5:7",
  "widthLabel": "Ancho",
  "heightLabel": "Alto",
  "pixelsUnit": "px",
  "invalidSize": "Introduce un ancho y alto válidos (números enteros mayores que 0).",
  "cropButton": "Recortar y exportar",
  "cropping": "Recortando…",
  "remove": "Eliminar imagen",
  "tabOriginal": "Original",
  "tabCropped": "Recortada",
  "download": "Descargar",
  "recrop": "Volver a recortar",
  "errorFormat": "Formato no compatible. Usa un archivo JPEG, PNG o WebP.",
  "errorSize": "El archivo supera el límite de 20 MB.",
  "errorFailed": "Error al recortar. Inténtalo de nuevo."
}
```

`fr`:
```json
"img-crop": {
  "title": "Recadrage d'images",
  "description": "Recadrez des images JPEG, PNG et WebP localement — librement, avec un format fixe ou à une taille exacte en pixels — puis compressez et téléchargez. Rien ne quitte votre navigateur.",
  "drop": "Déposez une image ici ou cliquez pour parcourir",
  "dropHint": "Prend en charge JPEG, PNG, WebP · Max 20 Mo",
  "dragActive": "Relâchez pour uploader",
  "modeFree": "Libre",
  "modeAspect": "Format fixe",
  "modeFixed": "Taille fixe",
  "customRatioPlaceholder": "Personnalisé, ex. 5:7",
  "widthLabel": "Largeur",
  "heightLabel": "Hauteur",
  "pixelsUnit": "px",
  "invalidSize": "Saisissez une largeur et une hauteur valides (nombres entiers supérieurs à 0).",
  "cropButton": "Recadrer et exporter",
  "cropping": "Recadrage…",
  "remove": "Supprimer l'image",
  "tabOriginal": "Original",
  "tabCropped": "Recadrée",
  "download": "Télécharger",
  "recrop": "Recadrer à nouveau",
  "errorFormat": "Format non pris en charge. Veuillez utiliser un fichier JPEG, PNG ou WebP.",
  "errorSize": "Le fichier dépasse la limite de 20 Mo.",
  "errorFailed": "Échec du recadrage. Veuillez réessayer."
}
```

`ja`:
```json
"img-crop": {
  "title": "画像切り抜き",
  "description": "JPEG、PNG、WebP 画像をブラウザ上でローカルに切り抜きます——自由形式、固定アスペクト比、または正確なピクセルサイズで切り抜いた後、圧縮してダウンロードできます。データは外部に送信されません。",
  "drop": "画像をここにドロップ、またはクリックして選択",
  "dropHint": "JPEG、PNG、WebP 対応 · 最大 20 MB",
  "dragActive": "リリースしてアップロード",
  "modeFree": "自由",
  "modeAspect": "アスペクト比",
  "modeFixed": "固定サイズ",
  "customRatioPlaceholder": "カスタム（例: 5:7）",
  "widthLabel": "幅",
  "heightLabel": "高さ",
  "pixelsUnit": "px",
  "invalidSize": "有効な幅と高さを入力してください（0 より大きい整数）。",
  "cropButton": "切り抜いてエクスポート",
  "cropping": "切り抜き中…",
  "remove": "画像を削除",
  "tabOriginal": "元の画像",
  "tabCropped": "切り抜き後",
  "download": "ダウンロード",
  "recrop": "再度切り抜く",
  "errorFormat": "未対応の形式です。JPEG、PNG、または WebP ファイルを使用してください。",
  "errorSize": "ファイルが 20 MB を超えています。",
  "errorFailed": "切り抜きに失敗しました。再試行してください。"
}
```

`ko`:
```json
"img-crop": {
  "title": "이미지 자르기",
  "description": "JPEG, PNG, WebP 이미지를 로컬에서 자릅니다 — 자유형, 고정 비율 또는 정확한 픽셀 크기로 자른 후 압축하여 다운로드할 수 있습니다. 데이터가 브라우저 밖으로 전송되지 않습니다.",
  "drop": "이미지를 여기에 놓거나 클릭하여 찾아보기",
  "dropHint": "JPEG, PNG, WebP 지원 · 최대 20 MB",
  "dragActive": "놓아서 업로드",
  "modeFree": "자유",
  "modeAspect": "비율 고정",
  "modeFixed": "크기 고정",
  "customRatioPlaceholder": "사용자 지정, 예: 5:7",
  "widthLabel": "너비",
  "heightLabel": "높이",
  "pixelsUnit": "px",
  "invalidSize": "유효한 너비와 높이를 입력하세요 (0보다 큰 정수).",
  "cropButton": "자르고 내보내기",
  "cropping": "자르는 중…",
  "remove": "이미지 제거",
  "tabOriginal": "원본",
  "tabCropped": "자른 결과",
  "download": "다운로드",
  "recrop": "다시 자르기",
  "errorFormat": "지원되지 않는 형식입니다. JPEG, PNG 또는 WebP 파일을 사용하세요.",
  "errorSize": "파일이 20 MB 한도를 초과합니다.",
  "errorFailed": "자르기에 실패했습니다. 다시 시도하세요."
}
```

`pt`:
```json
"img-crop": {
  "title": "Recorte de Imagens",
  "description": "Recorte imagens JPEG, PNG e WebP localmente — livremente, com uma proporção fixa ou em um tamanho exato de pixels — depois comprima e baixe. Nada sai do seu navegador.",
  "drop": "Solte uma imagem aqui ou clique para procurar",
  "dropHint": "Suporta JPEG, PNG, WebP · Máx. 20 MB",
  "dragActive": "Solte para carregar",
  "modeFree": "Livre",
  "modeAspect": "Proporção Fixa",
  "modeFixed": "Tamanho Fixo",
  "customRatioPlaceholder": "Personalizado, ex.: 5:7",
  "widthLabel": "Largura",
  "heightLabel": "Altura",
  "pixelsUnit": "px",
  "invalidSize": "Insira uma largura e altura válidas (números inteiros maiores que 0).",
  "cropButton": "Recortar e Exportar",
  "cropping": "Recortando…",
  "remove": "Remover imagem",
  "tabOriginal": "Original",
  "tabCropped": "Recortada",
  "download": "Baixar",
  "recrop": "Recortar novamente",
  "errorFormat": "Formato não suportado. Use um arquivo JPEG, PNG ou WebP.",
  "errorSize": "O arquivo excede o limite de 20 MB.",
  "errorFailed": "Falha ao recortar. Tente novamente."
}
```

`ru`:
```json
"img-crop": {
  "title": "Обрезка изображений",
  "description": "Обрезайте изображения JPEG, PNG и WebP прямо в браузере — свободно, с фиксированным соотношением сторон или до точного размера в пикселях — затем сжимайте и скачивайте. Данные не покидают браузер.",
  "drop": "Перетащите изображение сюда или нажмите для выбора",
  "dropHint": "Поддерживает JPEG, PNG, WebP · Макс. 20 МБ",
  "dragActive": "Отпустите для загрузки",
  "modeFree": "Свободно",
  "modeAspect": "Соотношение сторон",
  "modeFixed": "Фиксированный размер",
  "customRatioPlaceholder": "Свой вариант, напр. 5:7",
  "widthLabel": "Ширина",
  "heightLabel": "Высота",
  "pixelsUnit": "px",
  "invalidSize": "Введите корректные ширину и высоту (целые числа больше 0).",
  "cropButton": "Обрезать и экспортировать",
  "cropping": "Обрезка…",
  "remove": "Удалить изображение",
  "tabOriginal": "Оригинал",
  "tabCropped": "Обрезанное",
  "download": "Скачать",
  "recrop": "Обрезать заново",
  "errorFormat": "Неподдерживаемый формат. Используйте файлы JPEG, PNG или WebP.",
  "errorSize": "Файл превышает лимит 20 МБ.",
  "errorFailed": "Не удалось обрезать. Попробуйте ещё раз."
}
```

- [ ] **Step 2: Validate every locale file is well-formed JSON and contains the new keys**

Run:
```bash
for loc in en zh de es fr ja ko pt ru; do
  node -e "const d=require('./src/i18n/locales/$loc/tools.json'); if(!d['img-crop']) throw new Error('$loc missing img-crop'); console.log('$loc OK')"
done
```
Expected: `en OK`, `zh OK`, `de OK`, `es OK`, `fr OK`, `ja OK`, `ko OK`, `pt OK`, `ru OK` — no thrown errors

- [ ] **Step 3: Run the build (prerender touches every locale)**

Run: `pnpm build`
Expected: exits 0

- [ ] **Step 4: Commit**

```bash
git add src/i18n/locales/en/tools.json src/i18n/locales/zh/tools.json src/i18n/locales/de/tools.json src/i18n/locales/es/tools.json src/i18n/locales/fr/tools.json src/i18n/locales/ja/tools.json src/i18n/locales/ko/tools.json src/i18n/locales/pt/tools.json src/i18n/locales/ru/tools.json
git commit -m "$(cat <<'EOF'
feat(i18n): add img-crop translations for all 9 locales

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Register the route, tool config, and lazy page import

**Files:**
- Modify: `src/lib/routes.ts:36-45`
- Modify: `src/lib/tools-config.ts` (import list + Image category array)
- Modify: `src/AppRoutes.tsx:56, 102`

**Interfaces:**
- Consumes: `ImgCropPage` from Task 6.
- Produces: `/image/crop` becomes reachable; `img-crop` tool card appears in the Image category on the home page.

- [ ] **Step 1: Add the route constant**

In `src/lib/routes.ts`, add `'/image/crop'` to the `TOOL_ROUTES` array, right after `'/image/compress'` (line 41):

```ts
  '/image/compress',
  '/image/crop',
```

- [ ] **Step 2: Register the tool config entry**

In `src/lib/tools-config.ts`:

1. Add `Crop` to the `lucide-react` import list (alongside `Minimize2`):
   ```ts
   Minimize2,
   Crop,
   ```

2. Add a new entry to the `TOOLS` array, directly after the `img-compress` entry:
   ```ts
   {
     id: 'img-crop',
     title: 'Image Crop',
     descriptionKey: 'img-crop.description',
     href: '/image/crop',
     icon: Crop,
     category: 'Image',
   },
   ```

- [ ] **Step 3: Register the lazy route**

In `src/AppRoutes.tsx`:

1. Add the lazy import next to `ImgCompressPage` (line 56):
   ```ts
   const ImgCropPage = lazy(() => import('@/pages/ImgCropPage').then(m => ({ default: m.ImgCropPage })))
   ```

2. Add the `<Route>` next to `image/compress` (line 102):
   ```tsx
   <Route path="image/crop" element={<Suspense fallback={<ToolSkeleton />}><ImgCropPage /></Suspense>} />
   ```

- [ ] **Step 4: Run the build**

Run: `pnpm build`
Expected: exits 0 (this also runs the prerender script, which walks `TOOL_ROUTES` — confirms `/image/crop` prerenders without error)

- [ ] **Step 5: Run the full test suite one more time**

Run: `pnpm test:run`
Expected: PASS (all suites, including `img-crop.test.ts` and `img-compress.test.ts`)

- [ ] **Step 6: Manual smoke check**

Run: `pnpm dev`, navigate to `/image/crop`:
- Upload a JPEG/PNG/WebP — the crop editor appears with a centered free-form box.
- Drag the box body — it moves and stays within the image bounds.
- Drag a corner handle in Free mode — it resizes.
- Switch to "Aspect Ratio", pick 1:1 — box becomes square; drag a corner — ratio stays locked; type a custom ratio like `5:7` — box re-centers to that ratio.
- Switch to "Fixed Size", enter 800×600 — box locks to 4:3; click "Crop & Export" — result view shows the cropped image at exactly 800×600 (check the stats bar dimensions).
- Switch output format to PNG/WebP, toggle lossless, drag the quality slider — all behave like the Image Compressor tool.
- Click "Re-crop" — returns to the editor with the same crop box; click Download — file downloads with the correct extension.
- Check light/dark mode and a narrow (mobile-width) viewport.

- [ ] **Step 7: Run `/taste-skill` UI/UX review**

Per this project's CLAUDE.md, no UI task is done without a `/taste-skill` audit. Run it against `ImgCropPage.tsx`, `ImageCropCanvas.tsx`, and `CompressSettingsPanel.tsx`, checking: visual hierarchy/spacing, interaction feedback (drag/resize/crop/download states), consistency with `ImgCompressPage`'s established patterns, keyboard/aria accessibility on the mode tabs and crop handles, and dark mode. Fix anything it flags before the final commit.

- [ ] **Step 8: Commit**

```bash
git add src/lib/routes.ts src/lib/tools-config.ts src/AppRoutes.tsx
git commit -m "$(cat <<'EOF'
feat(image): register Image Crop tool and route

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```
