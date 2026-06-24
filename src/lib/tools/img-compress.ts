// ?url imports → Vite emits WASM files as hashed assets. These live in the lazy page chunk,
// never in the main bundle. The locateFile override routes Emscripten to these URLs.
import mozjpegEncWasmUrl from '@jsquash/jpeg/codec/enc/mozjpeg_enc.wasm?url'
import webpEncWasmUrl from '@jsquash/webp/codec/enc/webp_enc.wasm?url'
import webpEncSimdWasmUrl from '@jsquash/webp/codec/enc/webp_enc_simd.wasm?url'
import pngWasmUrl from '@jsquash/png/codec/pkg/squoosh_png_bg.wasm?url'
import { init as initJpegImpl, default as encodeJpeg } from '@jsquash/jpeg/encode'
import { init as initPngImpl, default as encodePng } from '@jsquash/png/encode'
import { init as initWebpImpl, default as encodeWebp } from '@jsquash/webp/encode'

export type InputFormat = 'jpeg' | 'png' | 'webp'
export type OutputFormat = 'jpeg' | 'png' | 'webp'

export interface CompressOptions {
  outputFormat: OutputFormat
  quality: number
  lossless: boolean
}

export interface CompressResult {
  buffer: ArrayBuffer
  format: InputFormat
  mimeType: string
  extension: string
  width: number
  height: number
}

export function detectFormat(file: File): InputFormat | null {
  const mime = file.type.toLowerCase()
  if (mime === 'image/jpeg') return 'jpeg'
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext === 'jpg' || ext === 'jpeg') return 'jpeg'
  if (ext === 'png') return 'png'
  if (ext === 'webp') return 'webp'
  return null
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function buildOutputFilename(originalName: string, ext: string): string {
  return originalName.replace(/\.[^.]+$/, '') + '.' + ext
}

async function fileToImageData(file: File): Promise<{ data: ImageData; width: number; height: number }> {
  const bitmap = await createImageBitmap(file)
  const { width, height } = bitmap
  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()
  return { data: ctx.getImageData(0, 0, width, height), width, height }
}

// Each codec is initialized at most once per session
let jpegReady: Promise<void> | null = null
let pngReady: Promise<void> | null = null
let webpReady: Promise<void> | null = null

function ensureJpeg(): Promise<void> {
  if (!jpegReady) {
    jpegReady = initJpegImpl({ locateFile: (_path: string) => mozjpegEncWasmUrl })
  }
  return jpegReady
}

function ensurePng(): Promise<void> {
  if (!pngReady) {
    pngReady = initPngImpl(pngWasmUrl).then(() => undefined)
  }
  return pngReady
}

function ensureWebp(): Promise<void> {
  if (!webpReady) {
    webpReady = initWebpImpl({
      locateFile: (path: string) =>
        path.includes('simd') ? webpEncSimdWasmUrl : webpEncWasmUrl,
    }).then(() => undefined)
  }
  return webpReady
}

export function preloadCodecs(): Promise<void[]> {
  return Promise.all([ensureJpeg(), ensurePng(), ensureWebp()])
}

export async function compressImage(
  file: File,
  opts: CompressOptions,
): Promise<CompressResult> {
  const target: InputFormat = opts.outputFormat

  const { data, width, height } = await fileToImageData(file)

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
