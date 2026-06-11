import type { IHasher } from 'hash-wasm/dist/lib/WASMInterface'

export interface DigestOptions {
  mode?: 'text' | 'file'
  textEncoding?: 'utf8' | 'gbk'
  outputEncoding?: 'hex' | 'base64'
  input?: string
}

export interface FileDigestOptions {
  outputEncoding?: 'hex' | 'base64'
  chunkSize?: number
  onProgress?: (progress: { processedBytes: number; totalBytes: number; percent: number }) => void
  signal?: AbortSignal
}

function utf8ToBytes(input: string): Uint8Array {
  return new TextEncoder().encode(String(input ?? ''))
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const value of bytes) binary += String.fromCharCode(value)
  return btoa(binary)
}

function hexToBytes(hex: string): Uint8Array {
  const normalized = String(hex ?? '').trim().toLowerCase()
  if (!normalized || normalized.length % 2 !== 0 || /[^0-9a-f]/.test(normalized)) {
    throw new Error('Invalid hex digest')
  }
  const out = new Uint8Array(normalized.length / 2)
  for (let i = 0; i < normalized.length; i += 2) {
    out[i / 2] = Number.parseInt(normalized.slice(i, i + 2), 16)
  }
  return out
}

function convertHexOutput(hexDigest: string, outputEncoding: string): string {
  const normalized = String(outputEncoding ?? 'hex').toLowerCase()
  if (normalized === 'hex') return String(hexDigest ?? '').toLowerCase()
  if (normalized === 'base64') return bytesToBase64(hexToBytes(hexDigest))
  throw new Error(`Unsupported output encoding: ${outputEncoding}`)
}

export function isAbortError(error: unknown): boolean {
  return (
    (error as Error)?.name === 'AbortError' ||
    /aborted/i.test(String((error as Error)?.message ?? ''))
  )
}

export interface SingleHashToolOptions {
  createHasher: () => Promise<IHasher>
  hashText: (bytes: Uint8Array) => Promise<string>
}

export function createSingleHashTool({ createHasher, hashText }: SingleHashToolOptions) {
  async function digestText({ input = '', textEncoding = 'utf8', outputEncoding = 'hex' }: DigestOptions): Promise<string> {
    if (!String(input ?? '').length) throw new Error('输入为空，请先输入文本')
    let bytes: Uint8Array
    if (textEncoding === 'utf8') {
      bytes = utf8ToBytes(input)
    } else {
      throw new Error(`Unsupported text encoding: ${textEncoding}`)
    }
    const hexDigest = await hashText(bytes)
    return convertHexOutput(hexDigest, outputEncoding)
  }

  async function digestFile(file: File, { outputEncoding = 'hex', chunkSize = 2 * 1024 * 1024, onProgress, signal }: FileDigestOptions = {}): Promise<string> {
    if (!file) throw new Error('请选择文件后再计算')
    const hasher = await createHasher()
    const totalBytes = file.size
    let processedBytes = 0

    while (processedBytes < totalBytes) {
      if (signal?.aborted) throw new DOMException('File digest aborted', 'AbortError')
      const chunk = file.slice(processedBytes, processedBytes + chunkSize)
      const buffer = await chunk.arrayBuffer()
      if (signal?.aborted) throw new DOMException('File digest aborted', 'AbortError')
      hasher.update(new Uint8Array(buffer))
      processedBytes += buffer.byteLength
      onProgress?.({ processedBytes, totalBytes, percent: totalBytes ? Math.round((processedBytes / totalBytes) * 100) : 100 })
    }

    return convertHexOutput(hasher.digest('hex'), outputEncoding)
  }

  return { digestText, digestFile, isAbortError }
}

export interface MultiHashAlgorithm {
  key: string
  createHasher: () => Promise<IHasher>
  hashText: (bytes: Uint8Array) => Promise<string>
}

export function createMultiHashTool({ algorithms }: { algorithms: MultiHashAlgorithm[] }) {
  async function digestText({ input = '', textEncoding = 'utf8', outputEncoding = 'hex' }: DigestOptions): Promise<Record<string, string>> {
    if (!String(input ?? '').length) throw new Error('输入为空，请先输入文本')
    let bytes: Uint8Array
    if (textEncoding === 'utf8') {
      bytes = utf8ToBytes(input)
    } else {
      throw new Error(`Unsupported text encoding: ${textEncoding}`)
    }
    const entries = await Promise.all(
      algorithms.map(async ({ key, hashText }) => [key, convertHexOutput(await hashText(bytes), outputEncoding)])
    )
    return Object.fromEntries(entries)
  }

  async function digestFile(file: File, { outputEncoding = 'hex', chunkSize = 2 * 1024 * 1024, onProgress, signal }: FileDigestOptions = {}): Promise<Record<string, string>> {
    if (!file) throw new Error('请选择文件后再计算')
    const hashers = await Promise.all(algorithms.map(async ({ key, createHasher }) => [key, await createHasher()] as const))
    const totalBytes = file.size
    let processedBytes = 0

    while (processedBytes < totalBytes) {
      if (signal?.aborted) throw new DOMException('File digest aborted', 'AbortError')
      const chunk = file.slice(processedBytes, processedBytes + chunkSize)
      const buffer = await chunk.arrayBuffer()
      if (signal?.aborted) throw new DOMException('File digest aborted', 'AbortError')
      const bytes = new Uint8Array(buffer)
      for (const [, hasher] of hashers) hasher.update(bytes)
      processedBytes += buffer.byteLength
      onProgress?.({ processedBytes, totalBytes, percent: totalBytes ? Math.round((processedBytes / totalBytes) * 100) : 100 })
    }

    return Object.fromEntries(hashers.map(([key, hasher]) => [key, convertHexOutput(hasher.digest('hex'), outputEncoding)]))
  }

  return { digestText, digestFile, isAbortError }
}
