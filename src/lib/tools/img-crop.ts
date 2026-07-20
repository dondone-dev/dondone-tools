import { encodeImageData, type CompressOptions, type CompressResult } from './img-compress'

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
