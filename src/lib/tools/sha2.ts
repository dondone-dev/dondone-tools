import CryptoJS from 'crypto-js'
import type { DigestOptions, FileDigestOptions } from './hashwasm-common'

export { isAbortError } from './hashwasm-common'

export type Sha2Results = {
  sha224: string
  sha256: string
  sha384: string
  sha512: string
}

function utf8ToBytes(input: string): Uint8Array {
  return new TextEncoder().encode(String(input ?? ''))
}

function bytesToWordArray(bytes: Uint8Array): CryptoJS.lib.WordArray {
  const words: number[] = []
  for (let i = 0; i < bytes.length; i += 1) {
    words[i >>> 2] |= bytes[i] << (24 - (i % 4) * 8)
  }
  return CryptoJS.lib.WordArray.create(words as unknown as number[], bytes.length)
}

function bufferToWordArray(buffer: ArrayBuffer): CryptoJS.lib.WordArray {
  return bytesToWordArray(new Uint8Array(buffer))
}

function convertWordArray(wordArray: CryptoJS.lib.WordArray, outputEncoding: string): string {
  const normalized = String(outputEncoding ?? 'hex').toLowerCase()
  if (normalized === 'hex') return wordArray.toString(CryptoJS.enc.Hex).toLowerCase()
  if (normalized === 'base64') return wordArray.toString(CryptoJS.enc.Base64)
  throw new Error(`Unsupported output encoding: ${outputEncoding}`)
}

const algorithms = [
  ['sha224', CryptoJS.algo.SHA224] as const,
  ['sha256', CryptoJS.algo.SHA256] as const,
  ['sha384', CryptoJS.algo.SHA384] as const,
  ['sha512', CryptoJS.algo.SHA512] as const,
]

function digestWordArray(wordArray: CryptoJS.lib.WordArray, outputEncoding: string): Sha2Results {
  return Object.fromEntries(
    algorithms.map(([name, algorithm]) => [
      name,
      convertWordArray(algorithm.create().finalize(wordArray.clone()), outputEncoding),
    ])
  ) as Sha2Results
}

export function digestText({ input = '', textEncoding = 'utf8', outputEncoding = 'hex' }: DigestOptions): Sha2Results {
  if (!String(input ?? '').length) throw new Error('输入为空，请先输入文本')
  if (textEncoding !== 'utf8') throw new Error(`Unsupported text encoding: ${textEncoding}`)
  return digestWordArray(bytesToWordArray(utf8ToBytes(input)), outputEncoding)
}

export async function digestFile(file: File, { outputEncoding = 'hex', chunkSize = 2 * 1024 * 1024, onProgress, signal }: FileDigestOptions = {}): Promise<Sha2Results> {
  if (!file) throw new Error('请选择文件后再计算')
  const hashers = algorithms.map(([name, algorithm]) => [name, algorithm.create()] as const)
  const totalBytes = file.size
  let processedBytes = 0

  while (processedBytes < totalBytes) {
    if (signal?.aborted) throw new DOMException('File digest aborted', 'AbortError')
    const chunk = file.slice(processedBytes, processedBytes + chunkSize)
    const buffer = await chunk.arrayBuffer()
    if (signal?.aborted) throw new DOMException('File digest aborted', 'AbortError')
    const wordArray = bufferToWordArray(buffer)
    for (const [, hasher] of hashers) hasher.update(wordArray.clone())
    processedBytes += buffer.byteLength
    onProgress?.({ processedBytes, totalBytes, percent: totalBytes ? Math.round((processedBytes / totalBytes) * 100) : 100 })
  }

  return Object.fromEntries(hashers.map(([name, hasher]) => [name, convertWordArray(hasher.finalize(), outputEncoding)])) as Sha2Results
}
