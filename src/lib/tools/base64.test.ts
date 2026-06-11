import { test, expect } from 'vitest'
import { encodeText, decodeText } from './base64'

test('encodes hello+/ to known base64 and base64url', () => {
  const { base64, base64url } = encodeText('hello+/')
  expect(base64).toBe('aGVsbG8rLw==')
  expect(base64url).toBe('aGVsbG8rLw')
})

test('encodes simple ascii to base64', () => {
  const { base64, base64url } = encodeText('hello')
  expect(base64).toBe('aGVsbG8=')
  expect(base64url).toBe('aGVsbG8')
})

test('encodes Chinese UTF-8 text', () => {
  const { base64 } = encodeText('中文')
  expect(base64).toBe('5Lit5paH')
})

test('encode then decode round-trips ASCII', () => {
  const input = 'Hello, World! 123'
  const { base64 } = encodeText(input)
  expect(decodeText(base64)).toBe(input)
})

test('encode then decode round-trips Chinese text', () => {
  const input = '你好世界'
  const { base64 } = encodeText(input)
  expect(decodeText(base64)).toBe(input)
})

test('decodes standard base64 for Chinese text', () => {
  expect(decodeText('5Lit5paH')).toBe('中文')
})

test('decodes base64url (without padding) correctly', () => {
  expect(decodeText('aGVsbG8rLw')).toBe('hello+/')
})

test('encodeText throws on empty string', () => {
  expect(() => encodeText('')).toThrow()
})

test('decodeText throws on empty string', () => {
  expect(() => decodeText('')).toThrow()
})

test('decodeText throws on invalid base64', () => {
  expect(() => decodeText('%%%')).toThrow(/Invalid Base64/)
})
