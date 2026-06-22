import { describe, it, expect } from 'vitest'
import { normalizeName, sha256Hex } from './name-risk'

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
