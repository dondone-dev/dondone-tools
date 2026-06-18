import { describe, it, expect, vi, afterEach } from 'vitest'
import { parseIdCard, computeCheckDigit } from './id-card'

describe('computeCheckDigit', () => {
  it('computes the check digit for the first 17 digits', () => {
    expect(computeCheckDigit('11010519900307851')).toBe('0')
    expect(computeCheckDigit('50010119991231600')).toBe('X')
  })
})

describe('parseIdCard - 18 digit', () => {
  it('parses a valid female card', () => {
    const r = parseIdCard('110105199003078510')
    expect(r.valid).toBe(true)
    expect(r.format).toBe('18')
    expect(r.gender).toBe('male')
    expect(r.birthDate).toBe('1990-03-07')
    expect(r.zodiac).toBe('马')
    expect(r.constellation).toBe('双鱼座')
    expect(r.region.province).toBe('北京市')
    expect(r.region.district).toBe('朝阳区')
    expect(r.region.full).toBe('北京市 · 朝阳区')
    expect(r.checksum?.ok).toBe(true)
  })

  it('parses a valid female card with district under a prefecture city', () => {
    const r = parseIdCard('440305198512010525')
    expect(r.valid).toBe(true)
    expect(r.gender).toBe('female')
    expect(r.region.province).toBe('广东省')
    expect(r.region.city).toBe('深圳市')
    expect(r.region.district).toBe('南山区')
    expect(r.region.full).toBe('广东省 · 深圳市 · 南山区')
  })

  it('accepts an X check digit', () => {
    const r = parseIdCard('50010119991231600X')
    expect(r.valid).toBe(true)
    expect(r.region.province).toBe('重庆市')
  })

  it('normalizes lowercase x and whitespace', () => {
    const r = parseIdCard('  50010119991231600x  ')
    expect(r.valid).toBe(true)
    expect(r.normalized).toBe('50010119991231600X')
  })

  it('rejects a wrong check digit but still exposes region and birthDate', () => {
    const r = parseIdCard('110105199003078511')
    expect(r.valid).toBe(false)
    expect(r.reason).toBe('checksum')
    expect(r.checksum).toEqual({ expected: '0', actual: '1', ok: false })
    expect(r.region.province).toBe('北京市')
    expect(r.birthDate).toBe('1990-03-07')
  })

  it('rejects an impossible date', () => {
    const r = parseIdCard('110105199002308515')
    expect(r.valid).toBe(false)
    expect(r.reason).toBe('birthdate')
  })

  it('rejects non-existent leap day', () => {
    const r = parseIdCard('110105199902298515')
    expect(r.valid).toBe(false)
    expect(r.reason).toBe('birthdate')
  })

  it('flags an unknown region code', () => {
    const r = parseIdCard('990105199003078513')
    expect(r.region.unknown).toBe(true)
  })
})

describe('parseIdCard - 15 digit legacy', () => {
  it('parses a 15-digit card assuming 19xx birth year', () => {
    const r = parseIdCard('110105900307851')
    expect(r.valid).toBe(true)
    expect(r.format).toBe('15')
    expect(r.birthDate).toBe('1990-03-07')
    expect(r.gender).toBe('male')
    expect(r.checksum).toBeNull()
  })
})

describe('parseIdCard - invalid input', () => {
  it('flags empty input', () => {
    expect(parseIdCard('   ').reason).toBe('empty')
  })

  it('flags wrong length', () => {
    expect(parseIdCard('123').reason).toBe('length')
  })

  it('flags non-numeric body', () => {
    expect(parseIdCard('11010519900307851A').reason).toBe('format')
  })
})

describe('parseIdCard - age', () => {
  afterEach(() => vi.useRealTimers())

  it('computes age relative to today, before birthday', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00'))
    expect(parseIdCard('110105199003078510').age).toBe(35)
  })

  it('computes age relative to today, after birthday', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-01T00:00:00'))
    expect(parseIdCard('110105199003078510').age).toBe(36)
  })
})
