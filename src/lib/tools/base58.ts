import { utf8ToBytes, bytesToUtf8, bytesToHex } from './encoding-common'

export const BITCOIN_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
const ALPHABET_MAP = new Map(Array.from(BITCOIN_ALPHABET, (char, index) => [char, index]))

function encodeBytes(source: Uint8Array): string {
  if (source.length === 0) return ''
  let zeros = 0
  while (zeros < source.length && source[zeros] === 0) zeros += 1

  const digits: number[] = []
  for (let i = zeros; i < source.length; i += 1) {
    let carry = source[i]
    for (let j = 0; j < digits.length; j += 1) {
      carry += digits[j] << 8
      digits[j] = carry % 58
      carry = Math.floor(carry / 58)
    }
    while (carry > 0) {
      digits.push(carry % 58)
      carry = Math.floor(carry / 58)
    }
  }

  let output = '1'.repeat(zeros)
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    output += BITCOIN_ALPHABET[digits[i]]
  }
  return output
}

function decodeToBytes(input: string): Uint8Array {
  const value = String(input ?? '').trim()
  if (!value) throw new Error('输入为空，请先输入 Base58 内容')

  let zeros = 0
  while (zeros < value.length && value[zeros] === '1') zeros += 1

  const bytes: number[] = []
  for (const char of value.slice(zeros)) {
    const digit = ALPHABET_MAP.get(char)
    if (digit === undefined) throw new Error('Invalid Base58 input')
    let carry = digit
    for (let i = 0; i < bytes.length; i += 1) {
      carry += bytes[i] * 58
      bytes[i] = carry & 0xff
      carry >>= 8
    }
    while (carry > 0) {
      bytes.push(carry & 0xff)
      carry >>= 8
    }
  }

  const output = new Uint8Array(zeros + bytes.length)
  output.fill(0, 0, zeros)
  for (let i = 0; i < bytes.length; i += 1) {
    output[output.length - 1 - i] = bytes[i]
  }
  return output
}

export { encodeBytes }

export function encodeText(input: string): string {
  if (!String(input ?? '').length) throw new Error('输入为空，请先输入文本')
  return encodeBytes(utf8ToBytes(input))
}

export interface Base58DecodeResult {
  text: string
  hex: string
  hasText: boolean
}

export function decodeText(input: string): Base58DecodeResult {
  const bytes = decodeToBytes(input)
  let text = ''
  let hasText = false
  try {
    text = bytesToUtf8(bytes, { fatal: true })
    hasText = true
  } catch {
    text = ''
    hasText = false
  }
  return { text, hex: bytesToHex(bytes), hasText }
}
