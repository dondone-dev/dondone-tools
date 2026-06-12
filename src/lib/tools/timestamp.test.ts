import { test, expect } from 'vitest'
import { isMilliseconds, fromUnix, toUnix } from './timestamp'

test('isMilliseconds returns true for ms timestamps', () => {
  expect(isMilliseconds(1_700_000_000_000)).toBe(true)
})

test('isMilliseconds returns false for second timestamps', () => {
  expect(isMilliseconds(1_700_000_000)).toBe(false)
})

test('fromUnix converts seconds timestamp to ISO', () => {
  const result = fromUnix(0)
  expect(result.iso).toBe('1970-01-01T00:00:00.000Z')
})

test('fromUnix auto-detects milliseconds input', () => {
  const result = fromUnix(1_000_000_000_000)
  expect(result.iso).toBe('2001-09-09T01:46:40.000Z')
})

test('fromUnix throws on NaN', () => {
  expect(() => fromUnix(NaN)).toThrow('Invalid timestamp')
})

test('toUnix converts ISO string to seconds and ms', () => {
  const result = toUnix('1970-01-01T00:00:00.000Z')
  expect(result.seconds).toBe(0)
  expect(result.milliseconds).toBe(0)
})

test('toUnix converts known date correctly', () => {
  const result = toUnix('2001-09-09T01:46:40.000Z')
  expect(result.seconds).toBe(1_000_000_000)
  expect(result.milliseconds).toBe(1_000_000_000_000)
})

test('toUnix throws on invalid string', () => {
  expect(() => toUnix('not a date')).toThrow('Invalid date string')
})

test('toUnix throws on empty string', () => {
  expect(() => toUnix('')).toThrow()
})
