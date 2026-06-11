import { test, expect } from 'vitest'
import { encodeText, encodeBytes, decodeText, BITCOIN_ALPHABET } from './base58'

test('BITCOIN_ALPHABET has 58 unique characters without 0, O, I, l', () => {
  expect(BITCOIN_ALPHABET).toHaveLength(58)
  expect(BITCOIN_ALPHABET).not.toContain('0')
  expect(BITCOIN_ALPHABET).not.toContain('O')
  expect(BITCOIN_ALPHABET).not.toContain('I')
  expect(BITCOIN_ALPHABET).not.toContain('l')
})

test('encodes hello to known bitcoin base58 value', () => {
  expect(encodeText('hello')).toBe('Cn8eVZg')
})

test('decodes Cn8eVZg back to hello with hex', () => {
  const result = decodeText('Cn8eVZg')
  expect(result.text).toBe('hello')
  expect(result.hex).toBe('68656c6c6f')
  expect(result.hasText).toBe(true)
})

test('returns hex even when decoded bytes are not valid utf8', () => {
  const encoded = encodeBytes(Uint8Array.from([255, 0, 1]))
  const result = decodeText(encoded)
  expect(result.hex).toBe('ff0001')
  expect(result.hasText).toBe(false)
  expect(result.text).toBe('')
})

test('encode then decode round-trips ASCII text', () => {
  const input = 'Hello World'
  const encoded = encodeText(input)
  const { text } = decodeText(encoded)
  expect(text).toBe(input)
})

test('encode then decode round-trips Chinese text', () => {
  const input = '中文'
  const encoded = encodeText(input)
  const { text } = decodeText(encoded)
  expect(text).toBe(input)
})

test('encodes single zero byte [0x00] to "1"', () => {
  expect(encodeBytes(new Uint8Array([0]))).toBe('1')
})

test('encodes [0x00, 0x01] to "12" (leading zero preserved)', () => {
  expect(encodeBytes(new Uint8Array([0, 1]))).toBe('12')
})

test('encodes [0x00, 0x00] to "11" (two leading zero bytes)', () => {
  expect(encodeBytes(new Uint8Array([0, 0]))).toBe('11')
})

test('decodes "1" to single zero byte hex "00"', () => {
  const result = decodeText('1')
  expect(result.hex).toBe('00')
})

test('decodes "12" to [0x00, 0x01] (leading zero preserved)', () => {
  const result = decodeText('12')
  expect(result.hex).toBe('0001')
})

test('encode then decode round-trips leading zero bytes', () => {
  const input = new Uint8Array([0, 0, 104, 101, 108, 108, 111])
  const encoded = encodeBytes(input)
  const { hex } = decodeText(encoded)
  expect(hex).toBe('000068656c6c6f')
})

test('encodeText throws on empty string', () => {
  expect(() => encodeText('')).toThrow()
})

test('decodeText throws on invalid base58 characters', () => {
  expect(() => decodeText('0OIl')).toThrow(/Invalid Base58/)
})

test('decodeText throws on empty input', () => {
  expect(() => decodeText('')).toThrow()
})
