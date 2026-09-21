import { describe, expect, it } from 'vitest'
import { bd09ToGcj02, convertDatum, gcj02ToBd09, gcj02ToWgs84, isOutOfChina, wgs84ToGcj02 } from './coordinate-datum'

const BEIJING = { lng: 116.397428, lat: 39.90923 }
const NEW_YORK = { lng: -74.006, lat: 40.7128 }

describe('isOutOfChina', () => {
  it('flags points inside mainland China as not out of China', () => {
    expect(isOutOfChina(BEIJING)).toBe(false)
  })

  it('flags points far outside mainland China as out of China', () => {
    expect(isOutOfChina(NEW_YORK)).toBe(true)
  })
})

describe('wgs84ToGcj02 / gcj02ToWgs84', () => {
  it('offsets a mainland China point by a small but non-negligible amount', () => {
    const gcj02 = wgs84ToGcj02(BEIJING)
    const distance = Math.hypot(gcj02.lng - BEIJING.lng, gcj02.lat - BEIJING.lat)
    expect(distance).toBeGreaterThan(0.0001)
    expect(distance).toBeLessThan(0.01)
  })

  it('leaves points outside mainland China unchanged', () => {
    expect(wgs84ToGcj02(NEW_YORK)).toEqual(NEW_YORK)
    expect(gcj02ToWgs84(NEW_YORK)).toEqual(NEW_YORK)
  })

  it('round-trips WGS-84 -> GCJ-02 -> WGS-84 within a couple of meters', () => {
    const roundTripped = gcj02ToWgs84(wgs84ToGcj02(BEIJING))
    expect(roundTripped.lng).toBeCloseTo(BEIJING.lng, 5)
    expect(roundTripped.lat).toBeCloseTo(BEIJING.lat, 5)
  })
})

describe('gcj02ToBd09 / bd09ToGcj02', () => {
  it('offsets a GCJ-02 point when encrypting to BD-09', () => {
    const bd09 = gcj02ToBd09(BEIJING)
    expect(bd09.lng).not.toBeCloseTo(BEIJING.lng, 4)
    expect(bd09.lat).not.toBeCloseTo(BEIJING.lat, 4)
  })

  it('round-trips GCJ-02 -> BD-09 -> GCJ-02 within sub-meter precision', () => {
    const roundTripped = bd09ToGcj02(gcj02ToBd09(BEIJING))
    expect(roundTripped.lng).toBeCloseTo(BEIJING.lng, 6)
    expect(roundTripped.lat).toBeCloseTo(BEIJING.lat, 6)
  })
})

describe('convertDatum', () => {
  it('returns the same point unchanged when from and to datums match', () => {
    expect(convertDatum(BEIJING, 'WGS84', 'WGS84')).toEqual(BEIJING)
    expect(convertDatum(BEIJING, 'BD09', 'BD09')).toEqual(BEIJING)
  })

  it('composes WGS-84 -> BD-09 -> WGS-84 back to the original point', () => {
    const bd09 = convertDatum(BEIJING, 'WGS84', 'BD09')
    const roundTripped = convertDatum(bd09, 'BD09', 'WGS84')
    expect(roundTripped.lng).toBeCloseTo(BEIJING.lng, 5)
    expect(roundTripped.lat).toBeCloseTo(BEIJING.lat, 5)
  })

  it('matches the direct WGS-84 -> GCJ-02 transform', () => {
    expect(convertDatum(BEIJING, 'WGS84', 'GCJ02')).toEqual(wgs84ToGcj02(BEIJING))
  })
})
