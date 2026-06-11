import { sha3_224, sha3_256, sha3_384, sha3_512 } from 'js-sha3'
import type { DigestOptions, FileDigestOptions } from './hashwasm-common'

export { isAbortError } from './hashwasm-common'

export type Sha3Results = {
  'sha3-224': string
  'sha3-256': string
  'sha3-384': string
  'sha3-512': string
}

function utf8ToBytes(input: string): Uint8Array {
  return new TextEncoder().encode(String(input ?? ''))
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const value of bytes) binary += String.fromCharCode(value)
  return btoa(binary)
}

const algorithms = [
  ['sha3-224', sha3_224] as const,
  ['sha3-256', sha3_256] as const,
  ['sha3-384', sha3_384] as const,
  ['sha3-512', sha3_512] as const,
]

function convertResult(hasher: ReturnType<typeof sha3_256.create>, outputEncoding: string): string {
  const normalized = String(outputEncoding ?? 'hex').toLowerCase()
  if (normalized === 'hex') return hasher.hex().toLowerCase()
  if (normalized === 'base64') {
    const ab = hasher.arrayBuffer()
    return bytesToBase64(new Uint8Array(ab))
  }
  throw new Error(`Unsupported output encoding: ${outputEncoding}`)
}

export function digestText({ input = '', textEncoding = 'utf8', outputEncoding = 'hex' }: DigestOptions): Sha3Results {
  if (!String(input ?? '').length) throw new Error('输入为空，请先输入文本')
  if (textEncoding !== 'utf8') throw new Error(`Unsupported text encoding: ${textEncoding}`)
  const bytes = utf8ToBytes(input)
  return Object.fromEntries(
    algorithms.map(([name, algorithm]) => [name, convertResult(algorithm.create().update(bytes), outputEncoding)])
  ) as Sha3Results
}

export async function digestFile(file: File, { outputEncoding = 'hex', chunkSize = 2 * 1024 * 1024, onProgress, signal }: FileDigestOptions = {}): Promise<Sha3Results> {
  if (!file) throw new Error('请选择文件后再计算')
  const hashers = algorithms.map(([name, algorithm]) => [name, algorithm.create()] as const)
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

  return Object.fromEntries(hashers.map(([name, hasher]) => [name, convertResult(hasher, outputEncoding)])) as Sha3Results
}
