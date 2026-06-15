import { describe, expect, it, vi, beforeEach } from 'vitest'
import { parseExif } from './exif'

vi.mock('exifr', () => ({
  default: {
    parse: vi.fn(),
  },
}))

import exifr from 'exifr'
const mockParse = vi.mocked(exifr.parse)

function makeFile(name = 'photo.jpg'): File {
  return new File([new Uint8Array(4)], name, { type: 'image/jpeg' })
}

beforeEach(() => {
  mockParse.mockReset()
})

describe('parseExif — null / empty cases', () => {
  it('returns null when exifr returns null', async () => {
    mockParse.mockResolvedValue(null)
    expect(await parseExif(makeFile())).toBeNull()
  })

  it('returns null when exifr returns undefined', async () => {
    mockParse.mockResolvedValue(undefined)
    expect(await parseExif(makeFile())).toBeNull()
  })

  it('returns null when all recognised fields are absent', async () => {
    mockParse.mockResolvedValue({ UnknownTag: 42 })
    expect(await parseExif(makeFile())).toBeNull()
  })
})

describe('parseExif — camera section', () => {
  it('populates make and model', async () => {
    mockParse.mockResolvedValue({ Make: 'Apple', Model: 'iPhone 15 Pro' })
    const result = await parseExif(makeFile())
    const camera = result?.sections.find(s => s.id === 'camera')
    expect(camera?.fields).toContainEqual({ labelKey: 'make', value: 'Apple' })
    expect(camera?.fields).toContainEqual({ labelKey: 'model', value: 'iPhone 15 Pro' })
  })

  it('includes lens and software when present', async () => {
    mockParse.mockResolvedValue({ Make: 'Sony', LensModel: 'FE 24-70mm', Software: 'Lightroom' })
    const result = await parseExif(makeFile())
    const camera = result?.sections.find(s => s.id === 'camera')
    expect(camera?.fields.map(f => f.labelKey)).toContain('lens')
    expect(camera?.fields.map(f => f.labelKey)).toContain('software')
  })
})

describe('parseExif — exposure section', () => {
  it('formats shutter speed as fraction for sub-second values', async () => {
    mockParse.mockResolvedValue({ ExposureTime: 0.001 })
    const result = await parseExif(makeFile())
    const exposure = result?.sections.find(s => s.id === 'exposure')
    expect(exposure?.fields.find(f => f.labelKey === 'exposureTime')?.value).toBe('1/1000s')
  })

  it('formats shutter speed as whole seconds for >= 1', async () => {
    mockParse.mockResolvedValue({ ExposureTime: 2 })
    const result = await parseExif(makeFile())
    const field = result?.sections.find(s => s.id === 'exposure')?.fields.find(f => f.labelKey === 'exposureTime')
    expect(field?.value).toBe('2s')
  })

  it('formats aperture with f/ prefix', async () => {
    mockParse.mockResolvedValue({ FNumber: 1.8 })
    const result = await parseExif(makeFile())
    expect(result?.sections.find(s => s.id === 'exposure')?.fields.find(f => f.labelKey === 'fNumber')?.value).toBe('f/1.8')
  })

  it('formats focal length with mm suffix', async () => {
    mockParse.mockResolvedValue({ FocalLength: 24 })
    const result = await parseExif(makeFile())
    expect(result?.sections.find(s => s.id === 'exposure')?.fields.find(f => f.labelKey === 'focalLength')?.value).toBe('24mm')
  })

  it('formats ISO as plain number', async () => {
    mockParse.mockResolvedValue({ ISOSpeedRatings: 400 })
    const result = await parseExif(makeFile())
    expect(result?.sections.find(s => s.id === 'exposure')?.fields.find(f => f.labelKey === 'iso')?.value).toBe('400')
  })

  it('flash fired when bit 0 is set', async () => {
    mockParse.mockResolvedValue({ Flash: 1 })
    const result = await parseExif(makeFile())
    expect(result?.sections.find(s => s.id === 'exposure')?.fields.find(f => f.labelKey === 'flash')?.value).toBe('Fired')
  })

  it('flash did not fire when bit 0 is clear', async () => {
    mockParse.mockResolvedValue({ Flash: 24 })
    const result = await parseExif(makeFile())
    expect(result?.sections.find(s => s.id === 'exposure')?.fields.find(f => f.labelKey === 'flash')?.value).toBe('Did not fire')
  })
})

describe('parseExif — GPS section', () => {
  it('populates lat/lon fields and gps object', async () => {
    mockParse.mockResolvedValue({ latitude: 37.774929, longitude: -122.419416 })
    const result = await parseExif(makeFile())
    expect(result?.gps).toEqual({ lat: 37.774929, lon: -122.419416 })
    const gps = result?.sections.find(s => s.id === 'gps')
    expect(gps?.fields.find(f => f.labelKey === 'latitude')?.value).toBe('37.774929° N')
    expect(gps?.fields.find(f => f.labelKey === 'longitude')?.value).toBe('122.419416° W')
  })

  it('formats negative latitude as S', async () => {
    mockParse.mockResolvedValue({ latitude: -33.8688, longitude: 151.2093 })
    const result = await parseExif(makeFile())
    const gps = result?.sections.find(s => s.id === 'gps')
    expect(gps?.fields.find(f => f.labelKey === 'latitude')?.value).toMatch(/S$/)
    expect(gps?.fields.find(f => f.labelKey === 'longitude')?.value).toMatch(/E$/)
  })

  it('includes altitude when present', async () => {
    mockParse.mockResolvedValue({ latitude: 48.8566, longitude: 2.3522, GPSAltitude: 35.5 })
    const result = await parseExif(makeFile())
    expect(result?.sections.find(s => s.id === 'gps')?.fields.find(f => f.labelKey === 'altitude')?.value).toBe('35.5m')
  })

  it('omits GPS section when coordinates absent', async () => {
    mockParse.mockResolvedValue({ Make: 'Canon' })
    const result = await parseExif(makeFile())
    expect(result?.sections.find(s => s.id === 'gps')).toBeUndefined()
    expect(result?.gps).toBeUndefined()
  })
})

describe('parseExif — image section', () => {
  it('populates width and height', async () => {
    mockParse.mockResolvedValue({ ImageWidth: 4032, ImageHeight: 3024 })
    const result = await parseExif(makeFile())
    const image = result?.sections.find(s => s.id === 'image')
    expect(image?.fields.find(f => f.labelKey === 'width')?.value).toBe('4032px')
    expect(image?.fields.find(f => f.labelKey === 'height')?.value).toBe('3024px')
  })

  it('falls back to ExifImageWidth/Height when tiff dimensions absent', async () => {
    mockParse.mockResolvedValue({ ExifImageWidth: 1920, ExifImageHeight: 1080 })
    const result = await parseExif(makeFile())
    const image = result?.sections.find(s => s.id === 'image')
    expect(image?.fields.find(f => f.labelKey === 'width')?.value).toBe('1920px')
  })

  it('formats orientation 6 as 90° CW', async () => {
    mockParse.mockResolvedValue({ Orientation: 6 })
    const result = await parseExif(makeFile())
    expect(result?.sections.find(s => s.id === 'image')?.fields.find(f => f.labelKey === 'orientation')?.value).toBe('90° CW')
  })

  it('formats sRGB color space', async () => {
    mockParse.mockResolvedValue({ ColorSpace: 1 })
    const result = await parseExif(makeFile())
    expect(result?.sections.find(s => s.id === 'image')?.fields.find(f => f.labelKey === 'colorSpace')?.value).toBe('sRGB')
  })
})

describe('parseExif — datetime section', () => {
  it('formats Date objects to ISO-like string', async () => {
    mockParse.mockResolvedValue({ DateTimeOriginal: new Date('2024-03-15T10:30:00.000Z') })
    const result = await parseExif(makeFile())
    const dt = result?.sections.find(s => s.id === 'datetime')
    expect(dt?.fields.find(f => f.labelKey === 'dateTimeOriginal')?.value).toMatch(/^2024-03-15 \d{2}:\d{2}:\d{2}$/)
  })
})

describe('parseExif — full fixture with camera + exposure + GPS', () => {
  it('returns all five section types from a rich payload', async () => {
    mockParse.mockResolvedValue({
      Make: 'Apple',
      Model: 'iPhone 14 Pro',
      ExposureTime: 1 / 120,
      FNumber: 1.78,
      ISOSpeedRatings: 64,
      FocalLength: 6.86,
      Flash: 16,
      DateTimeOriginal: new Date('2023-09-12T14:22:00.000Z'),
      ImageWidth: 4032,
      ImageHeight: 3024,
      latitude: 51.5074,
      longitude: -0.1278,
      GPSAltitude: 12.3,
    })
    const result = await parseExif(makeFile())
    expect(result).not.toBeNull()
    const ids = result!.sections.map(s => s.id)
    expect(ids).toContain('camera')
    expect(ids).toContain('exposure')
    expect(ids).toContain('datetime')
    expect(ids).toContain('image')
    expect(ids).toContain('gps')
    expect(result!.gps).toEqual({ lat: 51.5074, lon: -0.1278 })
  })
})
