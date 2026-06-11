import SparkMD5 from 'spark-md5'
import type { DigestOptions, FileDigestOptions } from './hashwasm-common'

export { isAbortError } from './hashwasm-common'

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

function convertDigestOutput(hexDigest: string, outputEncoding: string): string {
  const normalized = String(outputEncoding ?? 'hex').toLowerCase()
  if (normalized === 'hex') return hexDigest.toLowerCase()
  if (normalized === 'base64') return bytesToBase64(hexToBytes(hexDigest))
  throw new Error(`Unsupported output encoding: ${outputEncoding}`)
}

export function digestText({ input = '', textEncoding = 'utf8', outputEncoding = 'hex' }: DigestOptions): string {
  if (!String(input ?? '').length) throw new Error('输入为空，请先输入文本')
  if (textEncoding !== 'utf8') throw new Error(`Unsupported text encoding: ${textEncoding}`)
  const bytes = utf8ToBytes(input)
  const hexDigest = SparkMD5.ArrayBuffer.hash(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer)
  return convertDigestOutput(hexDigest, outputEncoding)
}

export async function digestFile(file: File, { outputEncoding = 'hex', chunkSize = 2 * 1024 * 1024, onProgress, signal }: FileDigestOptions = {}): Promise<string> {
  if (!file) throw new Error('请选择文件后再计算')
  const spark = new SparkMD5.ArrayBuffer()
  const totalBytes = file.size
  let processedBytes = 0

  while (processedBytes < totalBytes) {
    if (signal?.aborted) throw new DOMException('File digest aborted', 'AbortError')
    const chunk = file.slice(processedBytes, processedBytes + chunkSize)
    const buffer = await chunk.arrayBuffer()
    if (signal?.aborted) throw new DOMException('File digest aborted', 'AbortError')
    spark.append(buffer)
    processedBytes += buffer.byteLength
    onProgress?.({ processedBytes, totalBytes, percent: totalBytes ? Math.round((processedBytes / totalBytes) * 100) : 100 })
  }

  return convertDigestOutput(spark.end(), outputEncoding)
}
