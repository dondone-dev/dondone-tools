import { describe, expect, test } from 'vitest'
import {
  evaluatePasswordStrength,
  findCommonPasswordMatches,
  getSplashDataMatches,
} from './password-strength'

describe('password strength dataset matching', () => {
  test('matches passwords from SecLists 10k case-insensitively', () => {
    const matches = findCommonPasswordMatches('PassWord')
    expect(matches).toContainEqual({
      dataset: 'SecLists 10k-most-common.txt',
      source: 'SecLists',
    })
  })

  test('matches SplashData years and ranks', () => {
    expect(getSplashDataMatches('starwars')).toEqual([
      { dataset: 'SplashData Worst Passwords 2015 Top 25', source: 'SplashData', year: 2015, rank: 25 },
      { dataset: 'SplashData Worst Passwords 2017 Top 25', source: 'SplashData', year: 2017, rank: 16 },
    ])
  })
})

describe('evaluatePasswordStrength', () => {
  test('returns empty state for blank input', () => {
    expect(evaluatePasswordStrength('')).toMatchObject({
      level: 'empty',
      score: 0,
      segmentCount: 0,
    })
  })

  test('forces weak when password appears in a common password dataset', () => {
    const result = evaluatePasswordStrength('password')
    expect(result.level).toBe('weak')
    expect(result.datasetMatches[0]?.dataset).toBe('SecLists 10k-most-common.txt')
    expect(result.summary).toMatch(/常见密码库/)
  })

  test('rates short mixed passwords as medium when not in datasets', () => {
    const result = evaluatePasswordStrength('Az9#kL')
    expect(result.level).toBe('medium')
    expect(result.segmentCount).toBe(2)
    expect(result.warnings).toContain('长度少于 8 位')
  })

  test('rates long passwords with varied character classes as strong', () => {
    const result = evaluatePasswordStrength('CorrectHorse_42')
    expect(result.level).toBe('strong')
    expect(result.segmentCount).toBe(3)
    expect(result.passedChecks).toContain('包含特殊符号')
  })

  test('rates very long varied passwords as very strong', () => {
    const result = evaluatePasswordStrength('Correct-Horse_42_Battery!')
    expect(result.level).toBe('very-strong')
    expect(result.segmentCount).toBe(4)
  })

  test('penalizes obvious sequences and repeated characters', () => {
    const result = evaluatePasswordStrength('Aaaa1234!')
    expect(result.level).toBe('medium')
    expect(result.warnings).toContain('包含常见连续序列')
    expect(result.warnings).toContain('包含连续重复字符')
  })
})
