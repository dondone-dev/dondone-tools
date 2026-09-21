export type Datum = 'WGS84' | 'GCJ02' | 'BD09'

export interface LngLat {
  lng: number
  lat: number
}

const PI = Math.PI
const X_PI = (PI * 3000.0) / 180.0
const EARTH_RADIUS = 6378245.0
const ECCENTRICITY_SQUARED = 0.006693421622965943

/** Mainland China's bounding box — outside it, WGS-84 and GCJ-02 are treated as identical. */
export function isOutOfChina({ lng, lat }: LngLat): boolean {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271
}

function transformLat(x: number, y: number): number {
  let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x))
  ret += ((20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0) / 3.0
  ret += ((20.0 * Math.sin(y * PI) + 40.0 * Math.sin((y / 3.0) * PI)) * 2.0) / 3.0
  ret += ((160.0 * Math.sin((y / 12.0) * PI) + 320.0 * Math.sin((y * PI) / 30.0)) * 2.0) / 3.0
  return ret
}

function transformLng(x: number, y: number): number {
  let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x))
  ret += ((20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0) / 3.0
  ret += ((20.0 * Math.sin(x * PI) + 40.0 * Math.sin((x / 3.0) * PI)) * 2.0) / 3.0
  ret += ((150.0 * Math.sin((x / 12.0) * PI) + 300.0 * Math.sin((x / 30.0) * PI)) * 2.0) / 3.0
  return ret
}

/** WGS-84 <-> GCJ-02 offset at a point, per the published national-surveying-bureau obfuscation formula. */
function wgs84Gcj02Delta(point: LngLat): LngLat {
  let dLat = transformLat(point.lng - 105.0, point.lat - 35.0)
  let dLng = transformLng(point.lng - 105.0, point.lat - 35.0)
  const radLat = (point.lat / 180.0) * PI
  const magic = 1 - ECCENTRICITY_SQUARED * Math.sin(radLat) * Math.sin(radLat)
  const sqrtMagic = Math.sqrt(magic)
  dLat = (dLat * 180.0) / (((EARTH_RADIUS * (1 - ECCENTRICITY_SQUARED)) / (magic * sqrtMagic)) * PI)
  dLng = (dLng * 180.0) / ((EARTH_RADIUS / sqrtMagic) * Math.cos(radLat) * PI)
  return { lng: dLng, lat: dLat }
}

export function wgs84ToGcj02(point: LngLat): LngLat {
  if (isOutOfChina(point)) return point
  const delta = wgs84Gcj02Delta(point)
  return { lng: point.lng + delta.lng, lat: point.lat + delta.lat }
}

export function gcj02ToWgs84(point: LngLat): LngLat {
  if (isOutOfChina(point)) return point
  const delta = wgs84Gcj02Delta(point)
  return { lng: point.lng - delta.lng, lat: point.lat - delta.lat }
}

export function gcj02ToBd09(point: LngLat): LngLat {
  const z = Math.sqrt(point.lng * point.lng + point.lat * point.lat) + 0.00002 * Math.sin(point.lat * X_PI)
  const theta = Math.atan2(point.lat, point.lng) + 0.000003 * Math.cos(point.lng * X_PI)
  return { lng: z * Math.cos(theta) + 0.0065, lat: z * Math.sin(theta) + 0.006 }
}

export function bd09ToGcj02(point: LngLat): LngLat {
  const x = point.lng - 0.0065
  const y = point.lat - 0.006
  const z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * X_PI)
  const theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * X_PI)
  return { lng: z * Math.cos(theta), lat: z * Math.sin(theta) }
}

export function convertDatum(point: LngLat, from: Datum, to: Datum): LngLat {
  if (from === to) return point

  const gcj02 = from === 'WGS84' ? wgs84ToGcj02(point) : from === 'BD09' ? bd09ToGcj02(point) : point

  if (to === 'GCJ02') return gcj02
  if (to === 'BD09') return gcj02ToBd09(gcj02)
  return gcj02ToWgs84(gcj02)
}
