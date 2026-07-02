import { describe, expect, it } from 'vitest'
import {
  BEAUTIFUL_STRING_CHARACTERS,
  DESCENDER_CHARACTERS,
  SPECIAL_CHARACTERS,
  generateRandomString,
  normalizeRandomStringOptions,
} from './random-string'

const sequence = (...values: number[]) => {
  let index = 0
  return () => {
    const value = values[index] ?? values[values.length - 1] ?? 0
    index += 1
    return value
  }
}

describe('normalizeRandomStringOptions', () => {
  it('clamps length and minimum numbers to supported ranges', () => {
    expect(normalizeRandomStringOptions({ length: -1, minimumNumbers: -1 })).toMatchObject({
      length: 0,
      minimumNumbers: 0,
    })
    expect(normalizeRandomStringOptions({ length: 2000, minimumNumbers: 9999 })).toMatchObject({
      length: 1024,
      minimumNumbers: 1024,
    })
  })

  it('uses the beautiful string character set and disables special characters', () => {
    const options = normalizeRandomStringOptions({
      includeLowercase: false,
      includeUppercase: true,
      includeNumbers: false,
      includeSpecial: true,
      minimumNumbers: 0,
      beautifulString: true,
    })

    expect(options.includeSpecial).toBe(false)
    expect(options.includeLowercase).toBe(false)
    expect(options.includeUppercase).toBe(true)
    expect(options.includeNumbers).toBe(false)
    expect(options.characterSet).toBe('ABCDEFGHJKLMNPQRSTUVWXYZ')
    expect([...DESCENDER_CHARACTERS].every((char) => !options.characterSet.includes(char))).toBe(true)
    expect([...SPECIAL_CHARACTERS].every((char) => !options.characterSet.includes(char))).toBe(true)
  })

  it('keeps selected lowercase and numbers available in beautiful string mode', () => {
    const options = normalizeRandomStringOptions({
      includeLowercase: true,
      includeUppercase: false,
      includeNumbers: true,
      includeSpecial: true,
      minimumNumbers: 1,
      beautifulString: true,
    })

    expect(options.includeLowercase).toBe(true)
    expect(options.includeUppercase).toBe(false)
    expect(options.includeNumbers).toBe(true)
    expect(options.includeSpecial).toBe(false)
    expect(options.characterSet).toBe('23456789abcdefhkmnrstuvwxz')
  })

  it('falls back to letters and numbers when no character class is selected', () => {
    const options = normalizeRandomStringOptions({
      includeLowercase: false,
      includeUppercase: false,
      includeNumbers: false,
      includeSpecial: false,
    })

    expect(options.includeLowercase).toBe(true)
    expect(options.includeUppercase).toBe(true)
    expect(options.includeNumbers).toBe(true)
    expect(options.characterSet).toMatch(/[A-Z]/)
    expect(options.characterSet).toMatch(/[a-z]/)
    expect(options.characterSet).toMatch(/[0-9]/)
  })
})

describe('generateRandomString', () => {
  it('supports empty strings when length is zero', () => {
    expect(generateRandomString({ length: 0 })).toBe('')
  })

  it('starts with a letter when requested', () => {
    const value = generateRandomString(
      {
        length: 12,
        includeLowercase: false,
        includeUppercase: true,
        includeNumbers: true,
        includeSpecial: true,
        minimumNumbers: 2,
        startWithLetter: true,
      },
      sequence(0.99, 0, 0.2, 0.4, 0.6, 0.8)
    )

    expect(value).toHaveLength(12)
    expect(value[0]).toMatch(/[A-Z]/)
    expect(value).toMatch(/^[A-Z0-9!@#$%^&*]+$/)
    expect(value.replace(/\D/g, '').length).toBeGreaterThanOrEqual(2)
  })

  it('preserves minimumNumbers guarantee when startWithLetter replaces a digit at index 0', () => {
    // Use random source that puts the guaranteed digit at position 0 after shuffle
    const value = generateRandomString(
      {
        length: 4,
        includeLowercase: false,
        includeUppercase: true,
        includeNumbers: true,
        includeSpecial: false,
        minimumNumbers: 1,
        startWithLetter: true,
      },
      sequence(0, 0, 0, 0, 0)
    )

    expect(value).toHaveLength(4)
    expect(value[0]).toMatch(/[A-Z]/)
    expect(value.replace(/\D/g, '').length).toBeGreaterThanOrEqual(1)
  })

  it('generates the requested length from selected classes', () => {
    const value = generateRandomString(
      {
        length: 12,
        includeLowercase: false,
        includeUppercase: true,
        includeNumbers: true,
        includeSpecial: false,
        minimumNumbers: 2,
      },
      sequence(0, 0.2, 0.4, 0.6, 0.8)
    )

    expect(value).toHaveLength(12)
    expect(value).toMatch(/^[A-Z0-9]+$/)
    expect(value.replace(/\D/g, '').length).toBeGreaterThanOrEqual(2)
  })

  it('keeps beautiful strings free of descenders and special characters', () => {
    const value = generateRandomString(
      {
        length: 64,
        minimumNumbers: 4,
        includeSpecial: true,
        beautifulString: true,
      },
      sequence(0.99, 0.75, 0.25, 0.5)
    )

    expect(value).toHaveLength(64)
    expect([...value].every((char) => BEAUTIFUL_STRING_CHARACTERS.includes(char))).toBe(true)
    expect(/[gyjpq]/.test(value)).toBe(false)
    expect(/[!@#$%^&*]/.test(value)).toBe(false)
  })
})
