import { test, expect } from 'vitest'
import { encodeImageBytes, decodeImageInput } from './base64-image'

// Minimal 1x1 PNG (from IDAT + IEND)
const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2WQAAAAASUVORK5CYII='

// PNG magic bytes: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
const PNG_MAGIC = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
// JPEG magic bytes
const JPEG_MAGIC = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])
// GIF magic bytes
const GIF_MAGIC = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])

test('decodeImageInput parses data url and extracts metadata', () => {
  const result = decodeImageInput(`data:image/png;base64,${pngBase64}`)
  expect(result.mimeType).toBe('image/png')
  expect(result.base64).toBe(pngBase64)
  expect(result.dataUrl).toBe(`data:image/png;base64,${pngBase64}`)
  expect(result.byteLength).toBeGreaterThan(0)
})

test('decodeImageInput detects PNG mime from pure base64', () => {
  const result = decodeImageInput(pngBase64)
  expect(result.mimeType).toBe('image/png')
})

test('encodeImageBytes encodes PNG magic bytes to correct data url', () => {
  const result = encodeImageBytes(PNG_MAGIC, 'image/png')
  expect(result.base64).toBe('iVBORw0KGgo=')
  expect(result.dataUrl).toBe('data:image/png;base64,iVBORw0KGgo=')
  expect(result.mimeType).toBe('image/png')
})

test('encodeImageBytes encodes JPEG magic bytes', () => {
  const result = encodeImageBytes(JPEG_MAGIC, 'image/jpeg')
  expect(result.mimeType).toBe('image/jpeg')
  expect(result.dataUrl).toMatch(/^data:image\/jpeg;base64,/)
})

test('decodeImageInput detects JPEG from magic bytes', () => {
  const { base64 } = encodeImageBytes(JPEG_MAGIC, 'image/jpeg')
  const result = decodeImageInput(base64)
  expect(result.mimeType).toBe('image/jpeg')
})

test('decodeImageInput detects GIF from magic bytes', () => {
  const { base64 } = encodeImageBytes(GIF_MAGIC, 'image/gif')
  const result = decodeImageInput(base64)
  expect(result.mimeType).toBe('image/gif')
})

test('decodeImageInput detects SVG from text content', () => {
  const svgContent = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>')
  const { base64 } = encodeImageBytes(svgContent, 'image/svg+xml')
  const result = decodeImageInput(base64)
  expect(result.mimeType).toBe('image/svg+xml')
})

test('decodeImageInput round-trips data url', () => {
  const original = `data:image/png;base64,${pngBase64}`
  const result = decodeImageInput(original)
  expect(result.dataUrl).toBe(original)
})

test('decodeImageInput throws on non-base64 input', () => {
  expect(() => decodeImageInput('not-base64!!!')).toThrow(/Unsupported|Invalid Base64/)
})

test('encodeImageBytes throws on invalid mime type', () => {
  expect(() => encodeImageBytes(PNG_MAGIC, 'text/plain')).toThrow()
})

test('decodeImageInput throws on empty input', () => {
  expect(() => decodeImageInput('')).toThrow()
})
