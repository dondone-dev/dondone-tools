import { describe, it, expect } from 'vitest'
import { computeDiff, computeJsonDiff, createUnifiedDiffPatch, JsonDiffParseError } from './text-diff'

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

describe('createUnifiedDiffPatch', () => {
  it('produces a git-style unified diff with file headers and a hunk', () => {
    const patch = createUnifiedDiffPatch('a\nb\nc\n', 'a\nb2\nc\n')
    expect(patch).toContain('diff --git a/original b/modified')
    expect(patch).toContain('--- a/original')
    expect(patch).toContain('+++ b/modified')
    expect(patch).toMatch(/@@ -1,3 \+1,3 @@/)
    expect(patch).toContain('-b')
    expect(patch).toContain('+b2')
  })

  it('produces only file headers with no hunks for identical text', () => {
    const patch = createUnifiedDiffPatch('a\nb\n', 'a\nb\n')
    expect(patch).toContain('--- a/original')
    expect(patch).toContain('+++ b/modified')
    expect(patch).not.toContain('@@')
  })
})
