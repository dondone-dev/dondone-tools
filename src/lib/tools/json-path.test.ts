import { describe, it, expect } from 'vitest'
import { buildJsonSegments } from './json-path'

function textOf(value: unknown, pretty: boolean): string {
  return buildJsonSegments(value, pretty)
    .map((s) => s.text)
    .join('')
}

describe('buildJsonSegments', () => {
  it('reproduces JSON.stringify pretty output exactly', () => {
    const value = { a: 1, b: { c: [1, 2, 3] }, d: null }
    expect(textOf(value, true)).toBe(JSON.stringify(value, null, 2))
  })

  it('reproduces JSON.stringify compact output exactly', () => {
    const value = { a: 1, b: { c: [1, 2, 3] }, d: null }
    expect(textOf(value, false)).toBe(JSON.stringify(value))
  })

  it('handles empty objects and arrays', () => {
    const value = { a: {}, b: [] }
    expect(textOf(value, true)).toBe(JSON.stringify(value, null, 2))
    expect(textOf(value, false)).toBe(JSON.stringify(value))
  })

  it('computes dot/bracket paths for nested keys and array indices', () => {
    const value = { xx: { bb: { cc: [{ dd: 1 }, { dd: 2 }] } } }
    const segments = buildJsonSegments(value, true)
    const ddValues = segments.filter((s) => s.kind === 'value' && s.text === '2')
    expect(ddValues).toHaveLength(1)
    expect(ddValues[0]).toMatchObject({ path: 'xx.bb.cc[1].dd' })
  })

  it('uses bracket notation for non-identifier keys', () => {
    const value = { 'my key': 1, '2bad': 2 }
    const segments = buildJsonSegments(value, true)
    const keys = segments.filter((s) => s.kind === 'key')
    expect(keys.map((k) => k.path)).toEqual(['["my key"]', '["2bad"]'])
  })

  it('marks the root value with $ when it is a bare primitive', () => {
    const segments = buildJsonSegments(42, true)
    expect(segments).toEqual([{ kind: 'value', text: '42', path: '$' }])
  })
})
