import { utf8ToBytes, bytesToUtf8, bytesToBase64, base64ToBytes, toBase64Url } from './encoding-common'

export interface Base64EncodeResult {
  base64: string
  base64url: string
}

export function encodeText(input: string): Base64EncodeResult {
  if (!String(input ?? '').length) throw new Error('输入为空，请先输入文本')
  const base64 = bytesToBase64(utf8ToBytes(input))
  return { base64, base64url: toBase64Url(base64) }
}

export function decodeText(input: string): string {
  if (!String(input ?? '').trim().length) throw new Error('输入为空，请先输入 Base64 内容')
  return bytesToUtf8(base64ToBytes(input), { fatal: true })
}
