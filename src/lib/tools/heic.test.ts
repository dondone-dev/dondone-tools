import { describe, it, expect } from 'vitest'
import { buildOutputFilename, encodeBmp, getFormatConfig, HEIC_FORMATS } from './heic'

describe('buildOutputFilename', () => {
  it('replaces .heic extension with .jpg', () => {
    expect(buildOutputFilename('photo.heic', 'jpeg')).toBe('photo.jpg')
  })

  it('is case-insensitive for .HEIC', () => {
    expect(buildOutputFilename('IMG_001.HEIC', 'jpeg')).toBe('IMG_001.jpg')
  })

  it('replaces .heif extension', () => {
    expect(buildOutputFilename('photo.heif', 'png')).toBe('photo.png')
  })

  it('uses .bmp extension for bitmap', () => {
    expect(buildOutputFilename('shot.heic', 'bmp')).toBe('shot.bmp')
  })

  it('uses .png extension for png', () => {
    expect(buildOutputFilename('IMG_0042.HEIF', 'png')).toBe('IMG_0042.png')
  })

  it('preserves the base name when no extension matches', () => {
    expect(buildOutputFilename('noext', 'jpeg')).toBe('noext.jpg')
  })
})

describe('getFormatConfig', () => {
  it('returns correct config for jpeg', () => {
    const cfg = getFormatConfig('jpeg')
    expect(cfg.mime).toBe('image/jpeg')
    expect(cfg.ext).toBe('jpg')
    expect(cfg.supportsQuality).toBe(true)
  })

  it('returns correct config for png', () => {
    const cfg = getFormatConfig('png')
    expect(cfg.mime).toBe('image/png')
    expect(cfg.supportsQuality).toBe(false)
  })

  it('returns correct config for bmp', () => {
    const cfg = getFormatConfig('bmp')
    expect(cfg.mime).toBe('image/bmp')
    expect(cfg.supportsQuality).toBe(false)
  })

  it('throws for unknown format', () => {
    // @ts-expect-error intentional unknown format
    expect(() => getFormatConfig('gif')).toThrow()
  })
})

describe('encodeBmp', () => {
  it('produces a Blob with image/bmp type', () => {
    const data = new Uint8ClampedArray([255, 0, 0, 255])  // 1×1 red pixel
    const blob = encodeBmp(data, 1, 1)
    expect(blob.type).toBe('image/bmp')
  })

  it('has correct BM signature in header', async () => {
    const data = new Uint8ClampedArray(4 * 4 * 4).fill(128)  // 4×4 grey
    const blob = encodeBmp(data, 4, 4)
    const buf = await blob.arrayBuffer()
    const bytes = new Uint8Array(buf)
    expect(bytes[0]).toBe(0x42)  // 'B'
    expect(bytes[1]).toBe(0x4d)  // 'M'
  })

  it('encodes BGR channel order', async () => {
    // 1×1 pixel: R=10, G=20, B=30, A=255
    const data = new Uint8ClampedArray([10, 20, 30, 255])
    const blob = encodeBmp(data, 1, 1)
    const buf = await blob.arrayBuffer()
    const pixels = new Uint8Array(buf, 54)
    expect(pixels[0]).toBe(30)  // B
    expect(pixels[1]).toBe(20)  // G
    expect(pixels[2]).toBe(10)  // R
  })
})

describe('HEIC_FORMATS', () => {
  it('has exactly 3 formats', () => {
    expect(HEIC_FORMATS).toHaveLength(3)
  })

  it('only jpeg supports quality', () => {
    const withQuality = HEIC_FORMATS.filter(f => f.supportsQuality)
    expect(withQuality).toHaveLength(1)
    expect(withQuality[0].id).toBe('jpeg')
  })
})
