import { describe, it, expect } from 'vitest'
import { computeDiff, computeJsonDiff, JsonDiffParseError } from './text-diff'

describe('computeDiff', () => {
  it('does not produce phantom diffs when only trailing newline differs', () => {
    const result = computeDiff('a\nb', 'a\nb\n')
    expect(result.removedCount).toBe(0)
    expect(result.addedCount).toBe(0)
  })

  it('reports no diff for identical text without trailing newlines', () => {
    const result = computeDiff('a\nb', 'a\nb')
    expect(result.addedCount).toBe(0)
    expect(result.removedCount).toBe(0)
  })

  it('correctly detects an appended line', () => {
    const result = computeDiff('a\nb', 'a\nb\nc')
    expect(result.addedCount).toBe(1)
    expect(result.removedCount).toBe(0)
  })
})

describe('computeJsonDiff', () => {
  it('treats minified and pretty-printed JSON with the same content as identical', () => {
    const result = computeJsonDiff('{"a":1,"b":2}', '{\n  "a": 1,\n  "b": 2\n}')
    expect(result.addedCount).toBe(0)
    expect(result.removedCount).toBe(0)
  })

  it('detects a real content difference between two JSON documents', () => {
    const result = computeJsonDiff('{"a":1}', '{"a":2}')
    expect(result.addedCount).toBeGreaterThan(0)
    expect(result.removedCount).toBeGreaterThan(0)
  })

  it('throws a JsonDiffParseError for the original side when it is invalid JSON', () => {
    expect(() => computeJsonDiff('{invalid', '{"a":1}')).toThrow(JsonDiffParseError)
    try {
      computeJsonDiff('{invalid', '{"a":1}')
    } catch (e) {
      expect((e as JsonDiffParseError).side).toBe('original')
    }
  })

  it('throws a JsonDiffParseError for the modified side when it is invalid JSON', () => {
    try {
      computeJsonDiff('{"a":1}', '{invalid')
    } catch (e) {
      expect((e as JsonDiffParseError).side).toBe('modified')
    }
  })
})
