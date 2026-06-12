import { test, expect } from 'vitest'
import { encodeUrl, decodeUrl } from './url-encode'

test('encodes special characters', () => {
  expect(encodeUrl('hello world')).toBe('hello%20world')
})

test('encodes url with params', () => {
  expect(encodeUrl('https://example.com/path?a=1&b=2')).toBe(
    'https%3A%2F%2Fexample.com%2Fpath%3Fa%3D1%26b%3D2'
  )
})

test('encode then decode round-trips', () => {
  const input = 'hello world & more! 中文'
  expect(decodeUrl(encodeUrl(input))).toBe(input)
})

test('decodes %20 to space', () => {
  expect(decodeUrl('hello%20world')).toBe('hello world')
})

test('encodeUrl throws on empty string', () => {
  expect(() => encodeUrl('')).toThrow()
})

test('decodeUrl throws on empty string', () => {
  expect(() => decodeUrl('')).toThrow()
})

test('decodeUrl throws on malformed input', () => {
  expect(() => decodeUrl('%')).toThrow()
  expect(() => decodeUrl('%zz')).toThrow()
})
