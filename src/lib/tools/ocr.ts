import { PaddleOCR } from '@paddleocr/paddleocr-js'
import type { OcrResult } from '@paddleocr/paddleocr-js'

export const MAX_FILE_SIZE = 10 * 1024 * 1024
export const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/bmp'] as const
type AllowedType = (typeof ALLOWED_TYPES)[number]

export type OcrErrorKind = 'format' | 'size' | 'inference'

export class OcrError extends Error {
  readonly kind: OcrErrorKind
  constructor(kind: OcrErrorKind, message?: string) {
    super(message ?? kind)
    this.kind = kind
  }
}

export function validateFile(file: File): void {
  if (!ALLOWED_TYPES.includes(file.type as AllowedType)) {
    throw new OcrError('format', file.type)
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new OcrError('size', String(file.size))
  }
}

export function flattenOcrResult(result: OcrResult): string {
  return [...result.items]
    .sort((a, b) => Math.min(...a.poly.map(p => p[1])) - Math.min(...b.poly.map(p => p[1])))
    .map(item => item.text)
    .join('\n')
}

interface OcrInst {
  predict: (input: unknown) => Promise<OcrResult[]>
  dispose: () => Promise<void>
}

let _instance: OcrInst | null = null
let _creating: Promise<OcrInst> | null = null
let _gen = 0
let _backend: 'gpu' | 'cpu' | null = null

export function isOcrReady(): boolean {
  return _instance !== null
}

export function isOcrStarted(): boolean {
  return _instance !== null || _creating !== null
}

export function getOcrBackend(): 'gpu' | 'cpu' | null {
  return _backend
}

export async function warmUpOcr(): Promise<void> {
  await getOrCreate()
}

async function getOrCreate(): Promise<OcrInst> {
  if (_instance) return _instance
  if (_creating) return _creating
  const gen = ++_gen
  const supportsWebGpu = typeof navigator !== 'undefined' && 'gpu' in navigator
  _creating = PaddleOCR.create({
    lang: 'ch',
    ocrVersion: 'PP-OCRv6',
    ortOptions: {
      backend: 'auto',
      wasmPaths: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.26.0/dist/',
    },
    worker: true,
  }).then(inst => {
    if (_gen === gen) {
      _instance = inst
      _backend = supportsWebGpu ? 'gpu' : 'cpu'
      _creating = null
    } else {
      inst.dispose().catch(() => {})
    }
    return inst
  }).catch((e: unknown) => {
    if (_gen === gen) _creating = null
    throw e
  })
  return _creating
}

export async function recognizeImage(file: File): Promise<string> {
  validateFile(file)
  let ocr: OcrInst
  try {
    ocr = await getOrCreate()
  } catch (e) {
    throw new OcrError('inference', e instanceof Error ? e.message : String(e))
  }
  try {
    const [result] = await ocr.predict(file)
    return flattenOcrResult(result)
  } catch (e) {
    throw new OcrError('inference', e instanceof Error ? e.message : String(e))
  }
}

export async function disposeOcr(): Promise<void> {
  _gen++
  const pending = _creating
  _creating = null
  if (pending) {
    try { await (await pending).dispose() } catch { /* ignore */ }
  }
  if (_instance) {
    await _instance.dispose()
    _instance = null
  }
  _backend = null
}
