import { describe, it, expect } from 'vitest'
import {
  MIN_CROP_SIZE,
  clampRectToBounds,
  moveRect,
  resizeRect,
  enforceAspectRatio,
  resizeRectWithRatio,
  parseCustomRatio,
  computeExportSize,
  initialCropRect,
} from './img-crop'

describe('clampRectToBounds', () => {
  it('leaves an in-bounds rect unchanged', () => {
    expect(clampRectToBounds({ x: 10, y: 10, width: 100, height: 100 }, 200, 200))
      .toEqual({ x: 10, y: 10, width: 100, height: 100 })
  })

  it('clamps a negative x to 0', () => {
    expect(clampRectToBounds({ x: -20, y: 10, width: 100, height: 100 }, 200, 200))
      .toEqual({ x: 0, y: 10, width: 100, height: 100 })
  })

  it('pulls x back so the rect fits inside the right edge', () => {
    expect(clampRectToBounds({ x: 150, y: 10, width: 100, height: 100 }, 200, 200))
      .toEqual({ x: 100, y: 10, width: 100, height: 100 })
  })

  it('raises width/height below the minimum size', () => {
    expect(clampRectToBounds({ x: 10, y: 10, width: 5, height: 5 }, 200, 200, 10))
      .toEqual({ x: 10, y: 10, width: 10, height: 10 })
  })

  it('caps width/height to the image bounds', () => {
    expect(clampRectToBounds({ x: 0, y: 0, width: 300, height: 300 }, 200, 200))
      .toEqual({ x: 0, y: 0, width: 200, height: 200 })
  })

  it('defaults minSize to MIN_CROP_SIZE', () => {
    const r = clampRectToBounds({ x: 0, y: 0, width: 1, height: 1 }, 200, 200)
    expect(r.width).toBe(MIN_CROP_SIZE)
    expect(r.height).toBe(MIN_CROP_SIZE)
  })
})

describe('moveRect', () => {
  it('translates by dx/dy within bounds', () => {
    expect(moveRect({ x: 10, y: 10, width: 50, height: 50 }, 5, -5, 200, 200))
      .toEqual({ x: 15, y: 5, width: 50, height: 50 })
  })

  it('clamps so the box cannot move past the left/top edge', () => {
    expect(moveRect({ x: 10, y: 10, width: 50, height: 50 }, -50, -50, 200, 200))
      .toEqual({ x: 0, y: 0, width: 50, height: 50 })
  })

  it('clamps so the box cannot move past the right/bottom edge', () => {
    expect(moveRect({ x: 100, y: 100, width: 50, height: 50 }, 100, 100, 200, 200))
      .toEqual({ x: 150, y: 150, width: 50, height: 50 })
  })
})

describe('resizeRect (free mode)', () => {
  it('grows from the se handle without moving x/y', () => {
    expect(resizeRect({ x: 10, y: 10, width: 50, height: 50 }, 'se', 20, 30))
      .toEqual({ x: 10, y: 10, width: 70, height: 80 })
  })

  it('grows from the nw handle by moving x/y and increasing size', () => {
    expect(resizeRect({ x: 10, y: 10, width: 50, height: 50 }, 'nw', -20, -30))
      .toEqual({ x: -10, y: -20, width: 70, height: 80 })
  })

  it('resizes only width from the e handle', () => {
    expect(resizeRect({ x: 10, y: 10, width: 50, height: 50 }, 'e', 20, 999))
      .toEqual({ x: 10, y: 10, width: 70, height: 50 })
  })

  it('resizes only height from the s handle', () => {
    expect(resizeRect({ x: 10, y: 10, width: 50, height: 50 }, 's', 999, 20))
      .toEqual({ x: 10, y: 10, width: 50, height: 70 })
  })
})

describe('enforceAspectRatio', () => {
  const rect = { x: 10, y: 20, width: 100, height: 80 }

  it('anchor top-left keeps x/y fixed, derives height from newWidth', () => {
    expect(enforceAspectRatio(rect, 140, 2, 'top-left'))
      .toEqual({ x: 10, y: 20, width: 140, height: 70 })
  })

  it('anchor top-right keeps the right edge fixed', () => {
    expect(enforceAspectRatio(rect, 140, 2, 'top-right'))
      .toEqual({ x: -30, y: 20, width: 140, height: 70 })
  })

  it('anchor bottom-left keeps the bottom edge fixed', () => {
    expect(enforceAspectRatio(rect, 140, 2, 'bottom-left'))
      .toEqual({ x: 10, y: 30, width: 140, height: 70 })
  })

  it('anchor bottom-right keeps the bottom-right corner fixed', () => {
    expect(enforceAspectRatio(rect, 140, 2, 'bottom-right'))
      .toEqual({ x: -30, y: 30, width: 140, height: 70 })
  })
})

describe('resizeRectWithRatio', () => {
  const rect = { x: 10, y: 20, width: 100, height: 50 }

  it('se handle grows width by +dx and derives height from ratio', () => {
    expect(resizeRectWithRatio(rect, 'se', 2, 40))
      .toEqual({ x: 10, y: 20, width: 140, height: 70 })
  })

  it('sw handle grows width by -dx (dragging left grows it) and shifts x', () => {
    expect(resizeRectWithRatio(rect, 'sw', 2, -40))
      .toEqual({ x: -30, y: 20, width: 140, height: 70 })
  })
})

describe('parseCustomRatio', () => {
  it('parses a simple integer ratio', () => {
    expect(parseCustomRatio('4:3')).toBeCloseTo(4 / 3)
  })

  it('parses a 1:1 ratio', () => {
    expect(parseCustomRatio('1:1')).toBe(1)
  })

  it('trims surrounding whitespace around the colon', () => {
    expect(parseCustomRatio(' 16 : 9 ')).toBeCloseTo(16 / 9)
  })

  it('returns null for a zero component', () => {
    expect(parseCustomRatio('0:5')).toBeNull()
  })

  it('returns null for a negative component', () => {
    expect(parseCustomRatio('-1:2')).toBeNull()
  })

  it('returns null for non-numeric input', () => {
    expect(parseCustomRatio('abc')).toBeNull()
  })

  it('returns null when missing the colon', () => {
    expect(parseCustomRatio('43')).toBeNull()
  })
})

describe('computeExportSize', () => {
  const rect = { x: 0, y: 0, width: 320.4, height: 240.6 }

  it('returns the fixed target size in fixed mode', () => {
    expect(computeExportSize(rect, 'fixed', { width: 800, height: 600 }))
      .toEqual({ width: 800, height: 600 })
  })

  it('returns the rounded rect size in free mode', () => {
    expect(computeExportSize(rect, 'free', null)).toEqual({ width: 320, height: 241 })
  })

  it('returns the rounded rect size in aspect mode', () => {
    expect(computeExportSize(rect, 'aspect', null)).toEqual({ width: 320, height: 241 })
  })
})

describe('initialCropRect', () => {
  it('centers an 80% box with no ratio constraint', () => {
    expect(initialCropRect(1000, 500, null))
      .toEqual({ x: 100, y: 50, width: 800, height: 400 })
  })

  it('fits an 80%-wide box to a ratio when height allows it', () => {
    // 1000x1000 image, ratio 2:1 -> width=800, height=400, both within 80% bounds
    expect(initialCropRect(1000, 1000, 2))
      .toEqual({ x: 100, y: 300, width: 800, height: 400 })
  })

  it('shrinks to fit height when the ratio box would exceed 80% height', () => {
    // 1000x400 image, ratio 1:1 -> width=800 would need height=800 (too tall),
    // so height is capped to 80%*400=320 and width derives from ratio: 320
    expect(initialCropRect(1000, 400, 1))
      .toEqual({ x: 340, y: 40, width: 320, height: 320 })
  })
})
