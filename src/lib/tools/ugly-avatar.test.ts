import { test, expect } from 'vitest'
import { generateAvatar, BACKGROUND_PRESETS, AUTO_BACKGROUNDS, _clamp } from './ugly-avatar'

function makeSequenceRandom(values: number[]) {
  let index = 0
  return () => {
    const value = values[index % values.length]
    index += 1
    return value
  }
}

const FIXED_RANDOM = makeSequenceRandom([0.1, 0.3, 0.7, 0.9, 0.2, 0.4, 0.6, 0.8])

test('generateAvatar returns well-formed SVG string', () => {
  const { svg } = generateAvatar({ random: FIXED_RANDOM })
  expect(svg).toMatch(/^<svg[\s\S]*<\/svg>$/)
  expect(svg).toContain('<svg')
  expect(svg).toContain('</svg>')
})

test('generateAvatar returns correct viewBox size', () => {
  const { svg } = generateAvatar({ size: 256, random: FIXED_RANDOM })
  expect(svg).toContain('viewBox="0 0 256 256"')
})

test('generateAvatar dataUrl starts with correct prefix', () => {
  const { dataUrl } = generateAvatar({ random: FIXED_RANDOM })
  expect(dataUrl).toMatch(/^data:image\/svg\+xml;/)
})

test('generateAvatar returns specified size', () => {
  const { size } = generateAvatar({ size: 128, random: FIXED_RANDOM })
  expect(size).toBe(128)
})

test('generateAvatar includes background rect with valid hex color', () => {
  const { svg } = generateAvatar({ random: FIXED_RANDOM })
  expect(svg).toMatch(/<rect width="256" height="256" fill="#[0-9a-f]{6}"/i)
})

test('generateAvatar respects explicit background preset', () => {
  const { svg } = generateAvatar({ background: 'peach-puff', random: FIXED_RANDOM })
  expect(svg).toContain(BACKGROUND_PRESETS['peach-puff'])
})

test('BACKGROUND_PRESETS all values are valid hex colors', () => {
  for (const color of Object.values(BACKGROUND_PRESETS)) {
    expect(color).toMatch(/^#[0-9a-f]{6}$/i)
  }
})

test('AUTO_BACKGROUNDS is non-empty and contains hex colors', () => {
  expect(AUTO_BACKGROUNDS.length).toBeGreaterThan(0)
  for (const color of AUTO_BACKGROUNDS) {
    expect(color).toMatch(/^#[0-9a-f]{6}$/i)
  }
})

test('_clamp clamps values within range', () => {
  expect(_clamp(5, 0, 3)).toBe(3)
  expect(_clamp(-1, 0, 3)).toBe(0)
  expect(_clamp(2, 0, 3)).toBe(2)
})

test('generateAvatar with different seeds produces different SVGs', () => {
  const r1 = makeSequenceRandom([0.1, 0.3, 0.7, 0.9, 0.2, 0.4, 0.6, 0.8])
  const r2 = makeSequenceRandom([0.9, 0.7, 0.3, 0.1, 0.8, 0.6, 0.4, 0.2])
  const { svg: svg1 } = generateAvatar({ random: r1 })
  const { svg: svg2 } = generateAvatar({ random: r2 })
  expect(svg1).not.toBe(svg2)
})

test('generateAvatar exposes state with hair geometry arrays', () => {
  const { state } = generateAvatar({ random: FIXED_RANDOM })
  expect(Array.isArray(state.hairLines)).toBe(true)
  expect(Array.isArray(state.hairStrips)).toBe(true)
  expect(Array.isArray(state.faceGeometry.points)).toBe(true)
  expect(state.faceGeometry.points.length).toBeGreaterThan(0)
})

test('generateAvatar state has valid noise config', () => {
  const { state } = generateAvatar({ random: FIXED_RANDOM })
  expect(typeof state.noise.enabled).toBe('boolean')
  expect(typeof state.noise.frequency).toBe('number')
  expect(typeof state.noise.octaves).toBe('number')
  expect(typeof state.noise.scale).toBe('number')
})
