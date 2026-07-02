import { test, expect } from 'vitest'
import { analyzeText } from './string-length'

test('counts ASCII letters and digits without newlines', () => {
  const stats = analyzeText('abc123')
  expect(stats.length1).toBe(6)
  expect(stats.length2).toBe(6)
  expect(stats.chinese).toBe(0)
  expect(stats.letters).toBe(3)
  expect(stats.digits).toBe(3)
  expect(stats.spaces).toBe(0)
  expect(stats.halfWidth).toBe(6)
  expect(stats.fullWidth).toBe(0)
  expect(stats.newlines).toBe(0)
  expect(stats.totalLines).toBe(1)
})

test('counts Chinese full-width characters and logical CRLF newlines', () => {
  // Ａ(full-width), B, 中(Chinese), \u3000(full-width space), 1, \r\n, ２(full-width)
  const stats = analyzeText('ＡB中　1\r\n２')
  expect(stats.length1).toBe(6)
  expect(stats.length2).toBe(10) // 4 full-width × 2 + 2 half-width × 1
  expect(stats.chinese).toBe(1)
  expect(stats.letters).toBe(2)
  expect(stats.digits).toBe(1)
  expect(stats.spaces).toBe(1)
  expect(stats.halfWidth).toBe(3)
  expect(stats.fullWidth).toBe(4)
  expect(stats.newlines).toBe(1)
  expect(stats.totalLines).toBe(2)
})

test('treats empty input as zero lines and zero counts', () => {
  expect(analyzeText('')).toEqual({
    length1: 0, length2: 0, chinese: 0, letters: 0, digits: 0,
    spaces: 0, halfWidth: 0, fullWidth: 0, newlines: 0, totalLines: 0,
  })
})

test('totalLines is newlines + 1 for non-empty text', () => {
  const stats = analyzeText('a\nb\nc')
  expect(stats.newlines).toBe(2)
  expect(stats.totalLines).toBe(3)
})

test('standalone \\r counts as one newline', () => {
  const stats = analyzeText('a\rb')
  expect(stats.newlines).toBe(1)
  expect(stats.totalLines).toBe(2)
})

test('\\r\\n counts as single newline (CRLF)', () => {
  const stats = analyzeText('a\r\nb')
  expect(stats.newlines).toBe(1)
  expect(stats.totalLines).toBe(2)
})

test('full-width space \\u3000 counts as spaces', () => {
  const stats = analyzeText('\u3000')
  expect(stats.spaces).toBe(1)
  expect(stats.fullWidth).toBe(1)
})

test('ASCII space counts as space but not full-width', () => {
  const stats = analyzeText(' ')
  expect(stats.spaces).toBe(1)
  expect(stats.halfWidth).toBe(1)
  expect(stats.fullWidth).toBe(0)
})

test('ASCII text has length1 === length2', () => {
  const stats = analyzeText('Hello World 123')
  expect(stats.length1).toBe(stats.length2)
})
