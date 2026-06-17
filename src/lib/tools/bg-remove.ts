export const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25 MB
export const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const
type AllowedType = (typeof ALLOWED_TYPES)[number]

export type BgRemoveBackend = 'webgpu' | 'wasm'

export type BgRemoveErrorKind = 'format' | 'size' | 'load' | 'inference'

export class BgRemoveError extends Error {
  readonly kind: BgRemoveErrorKind
  constructor(kind: BgRemoveErrorKind, message?: string) {
    super(message ?? kind)
    this.kind = kind
  }
}

export function validateFile(file: File): void {
  if (!ALLOWED_TYPES.includes(file.type as AllowedType)) {
    throw new BgRemoveError('format', file.type)
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new BgRemoveError('size', String(file.size))
  }
}

// Worker singleton + pending request tracking
let _worker: Worker | null = null
let _nextId = 0
let _modelReady = false

type PendingEntry = {
  resolve: (blob: Blob) => void
  reject: (err: Error) => void
  onProgress?: (loaded: number, total: number) => void
  onModelReady?: (backend: BgRemoveBackend) => void
}

const _pending = new Map<number, PendingEntry>()

function getWorker(): Worker {
  if (_worker) return _worker
  _worker = new Worker(new URL('./bg-remove.worker.ts', import.meta.url), { type: 'module' })
  _worker.onmessage = (event: MessageEvent) => {
    const msg = event.data as
      | { type: 'progress'; loaded: number; total: number; id: number }
      | { type: 'model-ready'; backend: BgRemoveBackend; id: number }
      | { type: 'result'; blob: Blob; id: number }
      | { type: 'error'; message: string; id: number }

    const entry = _pending.get(msg.id)
    if (!entry) return

    if (msg.type === 'progress') {
      entry.onProgress?.(msg.loaded, msg.total)
    } else if (msg.type === 'model-ready') {
      _modelReady = true
      entry.onModelReady?.(msg.backend)
    } else if (msg.type === 'result') {
      _pending.delete(msg.id)
      entry.resolve(msg.blob)
    } else if (msg.type === 'error') {
      _pending.delete(msg.id)
      entry.reject(new BgRemoveError('inference', msg.message))
    }
  }
  _worker.onerror = (err) => {
    for (const entry of _pending.values()) {
      entry.reject(new BgRemoveError('load', err.message))
    }
    _pending.clear()
    _worker = null
    _modelReady = false
  }
  return _worker
}

export function isModelReady(): boolean {
  return _modelReady
}

export async function removeBackground(
  file: File,
  opts: {
    onProgress?: (loaded: number, total: number) => void
    onModelReady?: (backend: BgRemoveBackend) => void
  } = {},
): Promise<Blob> {
  validateFile(file)
  const id = _nextId++
  const worker = getWorker()
  return new Promise((resolve, reject) => {
    _pending.set(id, { resolve, reject, ...opts })
    worker.postMessage({ type: 'remove', blob: file, id })
  })
}

export function disposeWorker(): void {
  if (!_worker) return
  try { _worker.postMessage({ type: 'dispose' }) } catch { /* ignore */ }
  _worker = null
  _modelReady = false
  for (const entry of _pending.values()) {
    entry.reject(new BgRemoveError('inference', 'Worker disposed'))
  }
  _pending.clear()
}
