// ?url imports → Vite emits WASM files as hashed assets. These live in the lazy page chunk,
// never in the main bundle. The locateFile override routes Emscripten to these URLs.
import mozjpegEncWasmUrl from '@jsquash/jpeg/codec/enc/mozjpeg_enc.wasm?url'
import webpEncWasmUrl from '@jsquash/webp/codec/enc/webp_enc.wasm?url'
import webpEncSimdWasmUrl from '@jsquash/webp/codec/enc/webp_enc_simd.wasm?url'
import pngWasmUrl from '@jsquash/png/codec/pkg/squoosh_png_bg.wasm?url'
import { init as initJpegImpl, default as encodeJpeg } from '@jsquash/jpeg/encode'
import { init as initPngImpl, default as encodePng } from '@jsquash/png/encode'
import { init as initWebpImpl, default as encodeWebp } from '@jsquash/webp/encode'

import { zip } from 'fflate'

export type InputFormat = 'jpeg' | 'png' | 'webp'
export type OutputFormat = 'jpeg' | 'png' | 'webp' | 'auto'

export const MAX_IMAGES = 30
export const MAX_FILE_BYTES = 20 * 1024 * 1024 // 20 MB per file
export const MAX_TOTAL_BYTES = 100 * 1024 * 1024 // 100 MB total

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

export function resolveOutputFormat(
  inputFormat: InputFormat,
  outputFormat: OutputFormat,
  lossless: boolean,
): InputFormat {
  if (outputFormat === 'auto') {
    if (lossless && inputFormat === 'jpeg') return 'png'
    return inputFormat
  }
  return outputFormat
}

export function makeUniqueFilename(filename: string, existingNames: Set<string>): string {
  if (!existingNames.has(filename)) {
    existingNames.add(filename)
    return filename
  }
  const dotIdx = filename.lastIndexOf('.')
  const base = dotIdx !== -1 ? filename.slice(0, dotIdx) : filename
  const ext = dotIdx !== -1 ? filename.slice(dotIdx) : ''
  let counter = 1
  while (existingNames.has(`${base}_${counter}${ext}`)) {
    counter++
  }
  const uniqueName = `${base}_${counter}${ext}`
  existingNames.add(uniqueName)
  return uniqueName
}
export function createZipBundle(
  files: Array<{ name: string; buffer: ArrayBuffer }>,
): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    const usedNames = new Set<string>()
    const zippable: Record<string, Uint8Array> = {}

    for (const file of files) {
      const uniqueName = makeUniqueFilename(file.name, usedNames)
      zippable[uniqueName] = new Uint8Array(file.buffer)
    }

    zip(zippable, (err, data) => {
      if (err) {
        reject(err)
      } else {
        resolve(new Blob([data], { type: 'application/zip' }))
      }
    })
  })
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
    jpegReady = initJpegImpl({ locateFile: () => mozjpegEncWasmUrl })
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

export async function encodeImageData(
  data: ImageData,
  width: number,
  height: number,
  opts: CompressOptions,
  inputFormat?: InputFormat,
): Promise<CompressResult> {
  const target: InputFormat = resolveOutputFormat(inputFormat ?? 'jpeg', opts.outputFormat, opts.lossless)

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
  const inputFormat = detectFormat(file) ?? 'jpeg'
  const { data, width, height } = await fileToImageData(file)
  return encodeImageData(data, width, height, opts, inputFormat)
}
