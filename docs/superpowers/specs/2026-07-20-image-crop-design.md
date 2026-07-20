# Image Crop Tool Design

## Goal

Add a new "Image Crop" tool that lets users upload a JPEG/PNG/WebP image, crop it interactively (free-form, fixed aspect ratio, or fixed output pixel size), and export the cropped result with the same quality/format compression controls as the existing Image Compressor tool.

## Registration

- New page `src/pages/ImgCropPage.tsx`
- Route `/image/crop`, tool id `img-crop`, category `Image`, icon `Crop` (lucide-react)
- Register in `src/lib/routes.ts`, `src/lib/tools-config.ts`, `src/App.tsx`
- New `img-crop` namespace added to `tools.json` in all 9 locales

## Shared encoding refactor

`src/lib/tools/img-compress.ts`'s `compressImage(file, opts)` currently does `fileToImageData(file)` then encodes inline. Split the encode step into an exported `encodeImageData(data: ImageData, width: number, height: number, opts: CompressOptions): Promise<CompressResult>`. `compressImage` becomes `fileToImageData` + `encodeImageData`. Behavior is unchanged; this lets the crop tool encode a cropped `ImageData` without re-deriving codec init logic.

## Crop math — `src/lib/tools/img-crop.ts` (pure, unit-tested)

All rects are expressed in **natural image pixel coordinates**, never display/screen coordinates.

- `type CropRect = { x: number; y: number; width: number; height: number }`
- `type CropMode = 'free' | 'aspect' | 'fixed'`
- `clampRectToBounds(rect, imgWidth, imgHeight, minSize = 10): CropRect` — keeps the rect inside the image and never smaller than `minSize` on either axis
- `enforceAspectRatio(rect, ratio, anchor, imgWidth, imgHeight): CropRect` — recomputes width/height for a given ratio, holding the specified anchor (opposite corner/edge from the handle being dragged) fixed, then clamps to bounds
- `parseCustomRatio(input: string): number | null` — parses `"W:H"` text input; returns `null` for zero, negative, or non-numeric values
- `extractCrop(bitmap: ImageBitmap, rect: CropRect): ImageData` — draws the source sub-region onto an `OffscreenCanvas` and reads it back
- `computeExportSize(rect, mode, fixedSize): { width: number; height: number }` — for `fixed` mode, returns the target pixel size the extracted crop must be resized to; for `free`/`aspect`, returns the rect's own size unchanged

### Mode semantics

- **free** — crop box has no ratio constraint; all 8 handles resize independently.
- **aspect** — crop box ratio locked to a preset (1:1, 4:3, 3:2, 16:9, 9:16) or a custom `W:H` value; handles resize together via `enforceAspectRatio`. Exported pixel size equals the crop rect's own size.
- **fixed** — same locked-ratio handle behavior as `aspect` (ratio = `targetWidth / targetHeight`), but export additionally resizes the extracted region to the exact target pixel dimensions via `computeExportSize` + canvas scaling.

`aspect` and `fixed` share the same interactive mechanics; they differ only in where the ratio number comes from and whether a resize-to-exact-pixels step runs at export time.

## Interactive component — `src/components/tools/ImageCropCanvas.tsx`

New shared component, pointer-events only, no encoding logic:

- Renders the uploaded image with a darkened overlay outside the crop box and a clear window inside it
- Crop box drag (move) and 8-handle resize, aspect-locked when applicable
- Converts pointer/display coordinates to natural image coordinates and reports the current `CropRect` to the parent via a callback; all rect math (clamping, aspect enforcement) is delegated to `img-crop.ts`

## Shared settings panel — `src/components/tools/CompressSettingsPanel.tsx`

Extract the existing output-format selector + lossless toggle + quality slider block from `ImgCompressPage.tsx` into this shared component. `ImgCompressPage` and `ImgCropPage` both use it; behavior and appearance are unchanged from the current compress tool.

## Page flow — `ImgCropPage.tsx`

Layout matches `ImgCompressPage`'s `grid gap-4 lg:grid-cols-[1fr_272px]` shell.

1. **Empty state** — same drag/drop/click upload zone style as img-compress (JPEG/PNG/WebP, 20 MB limit, reuses `detectFormat`).
2. **Edit state** — left: image + `ImageCropCanvas` + mode tabs (Free / Aspect / Fixed size); aspect mode shows preset buttons + custom ratio input, fixed mode shows W/H number inputs. Right: `CompressSettingsPanel` + "Crop & Export" button.
3. **Result state** — Original/Cropped tab preview (same tab pattern as img-compress), stats bar showing before/after dimensions and byte size, Download button, and a "Re-crop" button that returns to the edit state with the crop rect/mode preserved (no re-upload needed).

## Error handling

- Format/size validation reuses img-compress's existing messages (`errorFormat`, `errorSize`).
- Fixed-size mode disables the export button and shows an inline message when width/height is zero, negative, or non-integer.
- Crop rect is always clamped by `clampRectToBounds`, so a degenerate (zero-area) selection cannot reach export.
- Encoding failures reuse the same generic try/catch pattern as img-compress.

## Testing

`src/lib/tools/img-crop.test.ts` covers:
- `clampRectToBounds` at image edges and below minimum size
- `enforceAspectRatio` for each anchor (all 4 corners + 4 edges)
- `computeExportSize` exactness for `fixed` mode
- `parseCustomRatio` boundary/invalid inputs

No component tests, per project convention. `img-compress.test.ts` continues to pass unchanged after the `encodeImageData` extraction (pure refactor, no behavior change).

## Validation

- `pnpm test:run` (new img-crop tests + unchanged img-compress tests)
- `pnpm build` (type-check, bundle, prerender)
- Manually verify all three crop modes, format switching, quality slider, download, and re-crop flow in light/dark mode and at a narrow viewport width
- Confirm all 9 locales contain the new `img-crop` keys
