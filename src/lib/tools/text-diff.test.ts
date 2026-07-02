import { describe, it, expect } from 'vitest'
import { computeDiff } from './text-diff'

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
