import { test, expect } from 'vitest'
import {
  utf8ToBytes,
  bytesToUtf8,
  bytesToHex,
  bytesToBase64,
  base64ToBytes,
  toBase64Url,
  normalizeBase64Input,
  formatBytes,
} from './encoding-common'

// utf8ToBytes / bytesToUtf8
test('utf8ToBytes and bytesToUtf8 round-trip ASCII', () => {
  const bytes = utf8ToBytes('hello')
  expect(bytesToUtf8(bytes)).toBe('hello')
})

test('utf8ToBytes and bytesToUtf8 round-trip Chinese', () => {
  const bytes = utf8ToBytes('中文')
  expect(bytesToUtf8(bytes)).toBe('中文')
})

test('utf8ToBytes and bytesToUtf8 round-trip emoji', () => {
  const bytes = utf8ToBytes('😀')
  expect(bytesToUtf8(bytes)).toBe('😀')
})

test('utf8ToBytes returns empty array for empty string', () => {
  expect(utf8ToBytes('')).toHaveLength(0)
})

test('bytesToUtf8 with fatal=true throws on invalid bytes', () => {
  expect(() => bytesToUtf8(new Uint8Array([0xff, 0xfe]), { fatal: true })).toThrow()
})

// bytesToHex
test('bytesToHex converts known bytes to lowercase hex', () => {
  expect(bytesToHex(new Uint8Array([0, 1, 255, 16]))).toBe('0001ff10')
})

test('bytesToHex returns empty string for empty array', () => {
  expect(bytesToHex(new Uint8Array([]))).toBe('')
})

// bytesToBase64 / base64ToBytes
test('bytesToBase64 encodes hello bytes to aGVsbG8=', () => {
  const bytes = new TextEncoder().encode('hello')
  expect(bytesToBase64(bytes)).toBe('aGVsbG8=')
})

test('base64ToBytes decodes aGVsbG8= back to hello bytes', () => {
  const bytes = base64ToBytes('aGVsbG8=')
  expect(new TextDecoder().decode(bytes)).toBe('hello')
})

test('bytesToBase64 and base64ToBytes round-trip binary data', () => {
  const original = new Uint8Array([0, 128, 255, 64, 32])
  const encoded = bytesToBase64(original)
  const decoded = base64ToBytes(encoded)
  expect(Array.from(decoded)).toEqual(Array.from(original))
})

// toBase64Url
test('toBase64Url converts + to - and / to _ and removes =', () => {
  expect(toBase64Url('aGVsbG8rLw==')).toBe('aGVsbG8rLw')
})

test('toBase64Url leaves already-clean base64url unchanged', () => {
  expect(toBase64Url('abc-_def')).toBe('abc-_def')
})

test('toBase64Url handles empty string', () => {
  expect(toBase64Url('')).toBe('')
})

// normalizeBase64Input
test('normalizeBase64Input accepts standard base64 unchanged', () => {
  expect(normalizeBase64Input('aGVsbG8=')).toBe('aGVsbG8=')
})

test('normalizeBase64Input converts base64url to standard base64', () => {
  const normalized = normalizeBase64Input('aGVsbG8rLw')
  expect(normalized).toMatch(/^[A-Za-z0-9+/]+=*$/)
})

test('normalizeBase64Input pads missing = signs', () => {
  const normalized = normalizeBase64Input('aGVsbG8')
  expect(normalized.length % 4).toBe(0)
})

test('normalizeBase64Input throws on illegal characters', () => {
  expect(() => normalizeBase64Input('%%invalid%%')).toThrow(/Invalid Base64/)
})

test('normalizeBase64Input returns empty string for empty input', () => {
  expect(normalizeBase64Input('')).toBe('')
})

// formatBytes
test('formatBytes formats bytes < 1024 as B', () => {
  expect(formatBytes(0)).toBe('0 B')
  expect(formatBytes(512)).toBe('512 B')
  expect(formatBytes(1023)).toBe('1023 B')
})

test('formatBytes formats 1024 as 1.0 KB', () => {
  expect(formatBytes(1024)).toBe('1.0 KB')
  expect(formatBytes(2048)).toBe('2.0 KB')
})

test('formatBytes formats large values as MB', () => {
  expect(formatBytes(1024 * 1024)).toBe('1.00 MB')
  expect(formatBytes(1024 * 1024 * 2.5)).toBe('2.50 MB')
})
