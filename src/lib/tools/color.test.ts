import { test, expect } from 'vitest'
import { hexToRgb, rgbToHex, rgbToHsl, hslToRgb, parseAnyColor } from './color'

test('hexToRgb converts 6-digit hex', () => {
  expect(hexToRgb('#1a2b3c')).toEqual([26, 43, 60])
})

test('hexToRgb converts 3-digit shorthand hex', () => {
  expect(hexToRgb('#fff')).toEqual([255, 255, 255])
})

test('hexToRgb converts without leading #', () => {
  expect(hexToRgb('ff0000')).toEqual([255, 0, 0])
})

test('hexToRgb throws on invalid hex', () => {
  expect(() => hexToRgb('#xyz')).toThrow()
})

test('rgbToHex converts rgb to hex', () => {
  expect(rgbToHex(255, 0, 0)).toBe('#ff0000')
  expect(rgbToHex(0, 255, 0)).toBe('#00ff00')
  expect(rgbToHex(0, 0, 255)).toBe('#0000ff')
})

test('hexToRgb and rgbToHex round-trip', () => {
  const hex = '#1a2b3c'
  const [r, g, b] = hexToRgb(hex)
  expect(rgbToHex(r, g, b)).toBe(hex)
})

test('rgbToHsl converts red to hsl(0, 100%, 50%)', () => {
  const [h, s, l] = rgbToHsl(255, 0, 0)
  expect(h).toBe(0)
  expect(s).toBe(100)
  expect(l).toBe(50)
})

test('hslToRgb converts hsl back to rgb', () => {
  const [r, g, b] = hslToRgb(0, 100, 50)
  expect(r).toBe(255)
  expect(g).toBe(0)
  expect(b).toBe(0)
})

test('rgbToHsl and hslToRgb round-trip', () => {
  const [r0, g0, b0] = [100, 150, 200]
  const [h, s, l] = rgbToHsl(r0, g0, b0)
  const [r1, g1, b1] = hslToRgb(h, s, l)
  expect(Math.abs(r1 - r0)).toBeLessThanOrEqual(2)
  expect(Math.abs(g1 - g0)).toBeLessThanOrEqual(2)
  expect(Math.abs(b1 - b0)).toBeLessThanOrEqual(2)
})

test('parseAnyColor parses hex string', () => {
  expect(parseAnyColor('#ff0000')).toEqual([255, 0, 0])
})

test('parseAnyColor parses rgb() string', () => {
  expect(parseAnyColor('rgb(26, 43, 60)')).toEqual([26, 43, 60])
})

test('parseAnyColor parses hsl() string', () => {
  const result = parseAnyColor('hsl(0, 100%, 50%)')
  expect(result).not.toBeNull()
  expect(result![0]).toBe(255)
})

test('parseAnyColor returns null on invalid input', () => {
  expect(parseAnyColor('not a color')).toBeNull()
  expect(parseAnyColor('')).toBeNull()
})
