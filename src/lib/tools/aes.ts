import CryptoJS from 'crypto-js'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

type Encoding = 'utf8' | 'hex' | 'base64'
type AesMode = 'cbc' | 'ecb' | 'ctr'
type AesPadding = 'pkcs7' | 'zero' | 'none'

export interface AesOptions {
  mode: AesMode
  padding: AesPadding
  inputEncoding: Encoding
  outputEncoding: Encoding
  keyEncoding: Encoding
  ivEncoding: Encoding
  keySizeBits: number
  key: string
  iv: string
  input: string
}

function normalizeEncoding(value: string): Encoding {
  return (String(value || 'utf8').trim().toLowerCase() as Encoding)
}

function normalizeMode(value: string): AesMode {
  return (String(value || 'cbc').trim().toLowerCase() as AesMode)
}

function normalizePadding(value: string): AesPadding {
  return (String(value || 'pkcs7').trim().toLowerCase() as AesPadding)
}

function bytesToWordArray(bytes: Uint8Array): CryptoJS.lib.WordArray {
  const words: number[] = []
  for (let i = 0; i < bytes.length; i += 1) {
    words[i >>> 2] |= bytes[i] << (24 - (i % 4) * 8)
  }
  return CryptoJS.lib.WordArray.create(words as unknown as number[], bytes.length)
}

function wordArrayToBytes(wordArray: CryptoJS.lib.WordArray): Uint8Array {
  const { words, sigBytes } = wordArray
  const out = new Uint8Array(sigBytes)
  for (let i = 0; i < sigBytes; i += 1) {
    out[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff
  }
  return out
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')
}

function hexToBytes(input: string): Uint8Array {
  const normalized = String(input || '').trim()
  if (!normalized) return new Uint8Array()
  if (normalized.length % 2 !== 0 || /[^0-9a-f]/i.test(normalized)) {
    throw new Error('Invalid hex input')
  }
  const out = new Uint8Array(normalized.length / 2)
  for (let i = 0; i < normalized.length; i += 2) {
    out[i / 2] = Number.parseInt(normalized.slice(i, i + 2), 16)
  }
  return out
}

function base64ToBytes(input: string): Uint8Array {
  const normalized = String(input || '').replace(/\s+/g, '')
  if (!normalized) return new Uint8Array()
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(normalized) || normalized.length % 4 === 1) {
    throw new Error('Invalid base64 input')
  }
  try {
    const binary = atob(normalized)
    const out = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) {
      out[i] = binary.charCodeAt(i)
    }
    return out
  } catch {
    throw new Error('Invalid base64 input')
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const value of bytes) {
    binary += String.fromCharCode(value)
  }
  return btoa(binary)
}

function trimTrailingZeros(bytes: Uint8Array): Uint8Array {
  let end = bytes.length
  while (end > 0 && bytes[end - 1] === 0) {
    end -= 1
  }
  return bytes.slice(0, end)
}

function requiresIv(mode: AesMode): boolean {
  return mode !== 'ecb'
}

function decodeInput(input: string, encoding: Encoding): Uint8Array {
  const normalizedEncoding = normalizeEncoding(encoding)
  if (normalizedEncoding === 'utf8') return encoder.encode(String(input || ''))
  if (normalizedEncoding === 'hex') return hexToBytes(input)
  if (normalizedEncoding === 'base64') return base64ToBytes(input)
  throw new Error(`Unsupported encoding: ${encoding}`)
}

function encodeOutput(bytes: Uint8Array, encoding: Encoding): string {
  const normalizedEncoding = normalizeEncoding(encoding)
  if (normalizedEncoding === 'utf8') return decoder.decode(bytes)
  if (normalizedEncoding === 'hex') return bytesToHex(bytes)
  if (normalizedEncoding === 'base64') return bytesToBase64(bytes)
  throw new Error(`Unsupported encoding: ${encoding}`)
}

function resolveMode(mode: AesMode) {
  if (mode === 'cbc') return CryptoJS.mode.CBC
  if (mode === 'ecb') return CryptoJS.mode.ECB
  if (mode === 'ctr') return CryptoJS.mode.CTR
  throw new Error(`Unsupported AES mode: ${mode}`)
}

function resolvePadding(padding: AesPadding, mode: AesMode) {
  if (mode === 'ctr') return CryptoJS.pad.NoPadding
  if (padding === 'pkcs7') return CryptoJS.pad.Pkcs7
  if (padding === 'zero') return CryptoJS.pad.ZeroPadding
  if (padding === 'none') return CryptoJS.pad.NoPadding
  throw new Error(`Unsupported padding: ${padding}`)
}

function decodeCiphertextInput(input: string, encoding: Encoding): Uint8Array {
  if (normalizeEncoding(encoding) !== 'utf8') return decodeInput(input, encoding)
  const normalizedInput = String(input || '').trim()
  if (!normalizedInput) return new Uint8Array()
  try { return hexToBytes(normalizedInput) } catch { /* fallthrough */ }
  try { return base64ToBytes(normalizedInput) } catch { /* fallthrough */ }
  return decodeInput(input, encoding)
}

export function getDefaultAesOptions(): AesOptions {
  return {
    mode: 'ecb',
    padding: 'pkcs7',
    inputEncoding: 'utf8',
    outputEncoding: 'base64',
    keyEncoding: 'utf8',
    ivEncoding: 'hex',
    keySizeBits: 128,
    key: '',
    iv: '',
    input: '',
  }
}

export function aesEncrypt(options: AesOptions): string {
  const mode = normalizeMode(options.mode)
  const padding = normalizePadding(options.padding)
  const keyBytes = decodeInput(options.key, options.keyEncoding)
  if (![16, 24, 32].includes(keyBytes.length)) {
    throw new Error('AES key length must be 16, 24, or 32 bytes')
  }
  const ivBytes = decodeInput(options.iv, options.ivEncoding)
  if (requiresIv(mode) && ivBytes.length !== 16) {
    throw new Error('IV must be exactly 16 bytes for the selected mode')
  }
  if (normalizeEncoding(options.outputEncoding) === 'utf8') {
    throw new Error('Ciphertext cannot be encoded as UTF-8 (binary data would be corrupted). Use Hex or Base64.')
  }
  const payloadBytes = decodeInput(options.input, options.inputEncoding)
  if (padding === 'none' && mode !== 'ctr' && payloadBytes.length % 16 !== 0) {
    throw new Error('Padding None requires 16-byte blocks for ECB/CBC')
  }

  const config: Record<string, unknown> = {
    mode: resolveMode(mode),
    padding: resolvePadding(padding, mode),
  }
  if (requiresIv(mode)) config.iv = bytesToWordArray(ivBytes)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const encrypted = CryptoJS.AES.encrypt(bytesToWordArray(payloadBytes), bytesToWordArray(keyBytes), config as any)
  return encodeOutput(wordArrayToBytes(encrypted.ciphertext), options.outputEncoding)
}

export function aesDecrypt(options: AesOptions): string {
  const mode = normalizeMode(options.mode)
  const padding = normalizePadding(options.padding)
  const keyBytes = decodeInput(options.key, options.keyEncoding)
  if (![16, 24, 32].includes(keyBytes.length)) {
    throw new Error('AES key length must be 16, 24, or 32 bytes')
  }
  const ivBytes = decodeInput(options.iv, options.ivEncoding)
  if (requiresIv(mode) && ivBytes.length !== 16) {
    throw new Error('IV must be exactly 16 bytes for the selected mode')
  }

  const ciphertextBytes = decodeCiphertextInput(options.input, options.inputEncoding)
  const cipherParams = CryptoJS.lib.CipherParams.create({
    ciphertext: bytesToWordArray(ciphertextBytes),
  })

  const config: Record<string, unknown> = {
    mode: resolveMode(mode),
    padding: resolvePadding(padding, mode),
  }
  if (requiresIv(mode)) config.iv = bytesToWordArray(ivBytes)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const decrypted = CryptoJS.AES.decrypt(cipherParams as unknown as string, bytesToWordArray(keyBytes), config as any)
  let bytes = wordArrayToBytes(decrypted)
  if (padding === 'zero' && mode !== 'ctr') {
    bytes = trimTrailingZeros(bytes)
  }

  return encodeOutput(bytes, options.outputEncoding)
}

export const aesTool = { getDefaultOptions: getDefaultAesOptions, encrypt: aesEncrypt, decrypt: aesDecrypt, requiresIv }
