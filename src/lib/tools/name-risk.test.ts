import { describe, it, expect } from 'vitest'
import { buildHashLookup, normalizeName, sha256Hex, type NameRiskV2 } from './name-risk'

describe('normalizeName', () => {
  it('trims leading/trailing whitespace', () => {
    expect(normalizeName('  张伟  ')).toBe('张伟')
  })

  it('removes internal spaces', () => {
    expect(normalizeName('张 伟')).toBe('张伟')
    expect(normalizeName('张　伟')).toBe('张伟') // fullwidth space
  })

  it('converts fullwidth ASCII to halfwidth', () => {
    expect(normalizeName('Ａｂｃ')).toBe('Abc')
    expect(normalizeName('１２３')).toBe('123')
  })

  it('preserves Chinese characters unchanged', () => {
    expect(normalizeName('张三')).toBe('张三')
    expect(normalizeName('歐陽娜娜')).toBe('歐陽娜娜')
  })

  it('returns empty string for blank input', () => {
    expect(normalizeName('   ')).toBe('')
  })
})

describe('sha256Hex', () => {
  it('returns a 64-char hex string', async () => {
    const h = await sha256Hex('张伟')
    expect(h).toHaveLength(64)
    expect(h).toMatch(/^[0-9a-f]+$/)
  })

  it('produces consistent output', async () => {
    const h1 = await sha256Hex('张三')
    const h2 = await sha256Hex('张三')
    expect(h1).toBe(h2)
  })

  it('produces different output for different inputs', async () => {
    const h1 = await sha256Hex('张三')
    const h2 = await sha256Hex('李四')
    expect(h1).not.toBe(h2)
  })
})

describe('buildHashLookup', () => {
  const v2: NameRiskV2 = {
    v: 2,
    hashBits: 48,
    generatedAt: '2026-06-22T00:00:00Z',
    count: 2,
    sevDict: ['info', 'yellow', 'red'],
    confDict: ['low', 'medium', 'high'],
    catDict: ['fiction_character', 'public_wanted_figure'],
    tagDict: ['novel', 'wanted'],
    hash: ['000e874ec862', 'aabbccddeeff'],
    sev: [2, 1],
    conf: [2, 1],
    cat: [[1], [0]],
    tag: [[1], [0]],
  }

  it('decodes columnar arrays into a keyed map', () => {
    const map = buildHashLookup(v2)
    expect(map.size).toBe(2)
    expect(map.get('000e874ec862')).toEqual({
      severity: 'red',
      categories: ['public_wanted_figure'],
      confidence: 'high',
    })
    expect(map.get('aabbccddeeff')).toEqual({
      severity: 'yellow',
      categories: ['fiction_character'],
      confidence: 'medium',
    })
  })

  it('returns undefined for an unknown hash', () => {
    expect(buildHashLookup(v2).get('ffffffffffff')).toBeUndefined()
  })
})
