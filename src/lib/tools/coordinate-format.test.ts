import { describe, expect, it } from 'vitest'
import { formatCoordinate, parseCoordinatePair, toDdmString, toDmsString } from './coordinate-format'

describe('parseCoordinatePair', () => {
  it('parses DMS with hemisphere letters', () => {
    const { lat, lng, detectedFormat } = parseCoordinatePair(`39°59'29.7"N 116°20'21.3"E`)
    expect(lat).toBeCloseTo(39.991583, 5)
    expect(lng).toBeCloseTo(116.339250, 5)
    expect(detectedFormat).toBe('dms')
  })

  it('parses DDM representing the same point as the DMS example', () => {
    const { lat, lng, detectedFormat } = parseCoordinatePair(`39°59.495'N 116°20.355'E`)
    expect(lat).toBeCloseTo(39.991583, 4)
    expect(lng).toBeCloseTo(116.339250, 4)
    expect(detectedFormat).toBe('ddm')
  })

  it('parses comma-separated decimal degrees representing the same point', () => {
    const { lat, lng, detectedFormat } = parseCoordinatePair('39.991583, 116.339250')
    expect(lat).toBeCloseTo(39.991583, 5)
    expect(lng).toBeCloseTo(116.339250, 5)
    expect(detectedFormat).toBe('decimal')
  })

  it('parses space-separated decimal degrees without a comma', () => {
    const { lat, lng } = parseCoordinatePair('38.5 120.3')
    expect(lat).toBe(38.5)
    expect(lng).toBe(120.3)
  })

  it('applies southern and western hemisphere letters as a negative sign', () => {
    const { lat, lng } = parseCoordinatePair(`33°52'4"S 151°12'36"E`)
    expect(lat).toBeLessThan(0)
    expect(lng).toBeGreaterThan(0)
  })

  it('resolves lat/lng by hemisphere letter regardless of input order', () => {
    const { lat, lng } = parseCoordinatePair(`116°20'21.3"E 39°59'29.7"N`)
    expect(lat).toBeCloseTo(39.991583, 5)
    expect(lng).toBeCloseTo(116.339250, 5)
  })
  it('preserves explicit minus signs when hemisphere letters are absent', () => {
    expect(parseCoordinatePair('40.7128N, -74.0060')).toMatchObject({ lat: 40.7128, lng: -74.006 })
    expect(parseCoordinatePair('40.7128 74.0060W')).toMatchObject({ lat: 40.7128, lng: -74.006 })
  })

  it('accepts leading hemisphere letters', () => {
    expect(parseCoordinatePair('S 33.8688, E 151.2093')).toMatchObject({ lat: -33.8688, lng: 151.2093 })
  })
  it('accepts space-separated leading hemisphere letters', () => {
    expect(parseCoordinatePair('N39.9916 W116.3393')).toMatchObject({ lat: 39.9916, lng: -116.3393 })
    expect(parseCoordinatePair('S33.8 E151.2')).toMatchObject({ lat: -33.8, lng: 151.2 })
  })

  it('preserves negative zero degrees in DMS and DDM', () => {
    expect(parseCoordinatePair(`-0°30'0.0" 10.0`).lat).toBeCloseTo(-0.5)
    expect(parseCoordinatePair(`-0°30' 10.0`).lat).toBeCloseTo(-0.5)
  })

  it('reports the latitude token format when coordinate order is reversed', () => {
    expect(parseCoordinatePair(`116°20'21.3"E 39.9916N`).detectedFormat).toBe('decimal')
  })


  it('rejects invalid minute and second values', () => {
    expect(() => parseCoordinatePair(`39°60'0"N 116°20'0"E`)).toThrow(/minutes and seconds/i)
    expect(() => parseCoordinatePair(`39°59'60"N 116°20'0"E`)).toThrow(/minutes and seconds/i)
  })

  it('throws when latitude is out of range', () => {
    expect(() => parseCoordinatePair('95.0, 116.0')).toThrow(/latitude/i)
  })

  it('throws when longitude is out of range', () => {
    expect(() => parseCoordinatePair('39.0, 190.0')).toThrow(/longitude/i)
  })

  it('throws when the input does not contain exactly two coordinates', () => {
    expect(() => parseCoordinatePair('39.9916')).toThrow()
    expect(() => parseCoordinatePair('not a coordinate')).toThrow()
  })
})

describe('formatCoordinate', () => {
  it('round-trips decimal -> DMS -> decimal within one arcsecond', () => {
    const original = 39.991583
    const dms = formatCoordinate(original, 'lat', 'dms')
    const reparsed = parseCoordinatePair(`${dms} ${formatCoordinate(116.5, 'lng', 'decimal')}`)
    expect(reparsed.lat).toBeCloseTo(original, 4)
  })

  it('carries seconds that round to 60 into the next minute', () => {
    // 39° 10' 59.996" rounds to 39°10'60.0" at 1-decimal precision without carrying.
    const value = 39 + 10 / 60 + 59.996 / 3600
    const dms = toDmsString(value, 'lat', 1)
    expect(dms).not.toContain("60.0")
    expect(dms).toBe(`39°11'0.0"N`)
  })

  it('carries minutes that round to 60 into the next degree', () => {
    const value = 39 + 59.9999 / 60
    const ddm = toDdmString(value, 'lat', 2)
    expect(ddm).not.toContain('60.00')
    expect(ddm).toBe(`40°0.00'N`)
  })

  it('uses S/W hemisphere letters for negative values', () => {
    expect(formatCoordinate(-33.8, 'lat', 'decimal')).toBe('-33.800000')
    expect(toDmsString(-33.8, 'lat')).toContain('S')
    expect(toDmsString(-33.8, 'lng')).toContain('W')
  })
})
