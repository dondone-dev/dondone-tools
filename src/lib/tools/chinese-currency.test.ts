import { describe, it, expect } from 'vitest'
import { toChineseCurrency } from './chinese-currency'

describe('toChineseCurrency', () => {
  it('matches the official bill amounts', () => {
    expect(toChineseCurrency(2667.27)).toBe('贰仟陆佰陆拾柒圆贰角柒分')
    expect(toChineseCurrency(2540.42)).toBe('贰仟伍佰肆拾圆肆角贰分')
  })

  it('appends 整 for whole-yuan amounts', () => {
    expect(toChineseCurrency(100)).toBe('壹佰圆整')
    expect(toChineseCurrency(2000)).toBe('贰仟圆整')
  })

  it('handles jiao without fen, and fen without jiao', () => {
    expect(toChineseCurrency(1000.5)).toBe('壹仟圆伍角整')
    expect(toChineseCurrency(100.07)).toBe('壹佰圆零柒分')
  })

  it('inserts 零 for internal zero digits', () => {
    expect(toChineseCurrency(1001)).toBe('壹仟零壹圆整')
    expect(toChineseCurrency(10001)).toBe('壹万零壹圆整')
    expect(toChineseCurrency(20030)).toBe('贰万零叁拾圆整')
  })

  it('handles the 万 boundary', () => {
    expect(toChineseCurrency(10000)).toBe('壹万圆整')
    expect(toChineseCurrency(34811)).toBe('叁万肆仟捌佰壹拾壹圆整')
  })

  it('rounds to two decimals and rejects invalid input', () => {
    expect(toChineseCurrency(2667.274)).toBe('贰仟陆佰陆拾柒圆贰角柒分')
    expect(toChineseCurrency(-5)).toBe('')
    expect(toChineseCurrency(NaN)).toBe('')
  })
})
