import { test, expect } from 'vitest'
import { decodeJwt, formatTimestamp } from './jwt-decode'

const SAMPLE_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  'eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.' +
  'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'

test('decodes a valid JWT into header, payload, signature', () => {
  const result = decodeJwt(SAMPLE_JWT)
  expect(result.header).toMatchObject({ alg: 'HS256', typ: 'JWT' })
  expect(result.payload).toMatchObject({ sub: '1234567890', name: 'John Doe' })
  expect(result.signature).toBe('SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c')
})

test('decodes iat field in payload', () => {
  const result = decodeJwt(SAMPLE_JWT)
  expect(result.payload.iat).toBe(1516239022)
})

test('throws on missing parts', () => {
  expect(() => decodeJwt('part1.part2')).toThrow('Invalid JWT')
})

test('throws on too many parts', () => {
  expect(() => decodeJwt('a.b.c.d')).toThrow('Invalid JWT')
})

test('throws on invalid base64', () => {
  expect(() => decodeJwt('!!!.!!!.!!!')).toThrow()
})

test('formatTimestamp converts unix seconds to locale string', () => {
  const result = formatTimestamp(0)
  expect(typeof result).toBe('string')
  expect(result!.length).toBeGreaterThan(0)
})

test('formatTimestamp returns null for non-number', () => {
  expect(formatTimestamp('not a number')).toBeNull()
  expect(formatTimestamp(null)).toBeNull()
})

test('decodes JWT with Chinese characters in payload', () => {
  // payload: {"sub":"1","name":"张三"}
  const jwt =
    'eyJhbGciOiJIUzI1NiJ9.' +
    'eyJzdWIiOiIxIiwibmFtZSI6IuW8oOS4iSJ9.' +
    'sig'
  const result = decodeJwt(jwt)
  expect(result.payload.name).toBe('张三')
})
