export type CoordinateFormat = 'decimal' | 'dms' | 'ddm'
export type CoordinateAxis = 'lat' | 'lng'

export interface ParsedCoordinate {
  lat: number
  lng: number
  detectedFormat: CoordinateFormat
}

interface Token {
  value: number
  hemi?: string
  format: CoordinateFormat
}

// One coordinate token: an optional leading hemisphere, degrees, optional minutes/seconds, and an optional trailing hemisphere.
const TOKEN_RE = /([NSEWnsew])?\s*(-?\d{1,3}(?:\.\d+)?)\s*°?\s*(?:(\d{1,2}(?:\.\d+)?)\s*['′]\s*(?:(\d{1,2}(?:\.\d+)?)\s*["″])?)?/y

function parseToken(
  degreeText: string,
  min: number | undefined,
  sec: number | undefined,
  leadingHemi: string | undefined,
  trailingHemi: string | undefined,
): Token {
  const deg = Number(degreeText)
  if ((min !== undefined && min >= 60) || (sec !== undefined && sec >= 60)) {
    throw new Error('Minutes and seconds must be less than 60')
  }
  const leading = leadingHemi?.toUpperCase()
  const trailing = trailingHemi?.toUpperCase()
  if (leading && trailing && leading !== trailing) {
    throw new Error('Leading and trailing hemispheres must match')
  }
  const sign = degreeText.trimStart().startsWith('-') ? -1 : 1
  const value = sign * (Math.abs(deg) + (min ?? 0) / 60 + (sec ?? 0) / 3600)
  const format: CoordinateFormat = sec !== undefined ? 'dms' : min !== undefined ? 'ddm' : 'decimal'
  return { value, hemi: leading ?? trailing, format }
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = []
  let offset = 0

  while (offset < input.length) {
    while (offset < input.length && /[\s,]/.test(input[offset])) offset++
    if (offset >= input.length) break

    TOKEN_RE.lastIndex = offset
    const match = TOKEN_RE.exec(input)
    if (!match || match.index !== offset) break

    const leadingHemi = match[1]
    const end = TOKEN_RE.lastIndex
    const coreHadTrailingSpace = /\s$/.test(input.slice(offset, end))
    let trailingHemi: string | undefined
    let nextOffset = end
    const suffix = input.slice(end).match(/^(\s*)([NSEWnsew])/)
    if (suffix) {
      const nextHemi = suffix[2].toUpperCase()
      const hasLeading = Boolean(leadingHemi)
      const adjacent = !coreHadTrailingSpace && suffix[1].length === 0
      const nextAfterHemi = input.slice(end + suffix[0].length)
      const nextIsCoordinate = /^\\s*(?:[-+]?\\d|[NSEWnsew])/.test(nextAfterHemi)
      const currentAxis = nextHemi === 'N' || nextHemi === 'S' ? 'lat' : 'lng'
      const nextTokenHemi = nextAfterHemi.match(/^\\s*([NSEWnsew])/)
      const nextAxis = nextTokenHemi && (nextTokenHemi[1].toUpperCase() === 'N' || nextTokenHemi[1].toUpperCase() === 'S') ? 'lat' : 'lng'
      if (adjacent || (!hasLeading && (!nextIsCoordinate || currentAxis !== nextAxis))) {
        trailingHemi = nextHemi
        nextOffset = end + suffix[0].length
      }
    }

    tokens.push(parseToken(match[2], match[3] !== undefined ? Number(match[3]) : undefined, match[4] !== undefined ? Number(match[4]) : undefined, leadingHemi, trailingHemi))
    offset = nextOffset
  }

  return tokens
}

/**
 * Parses a free-form pair of coordinates (lat + lng) from a single string.
 * Accepts DMS (39°59'29.7"N), DDM (39°59.495'N) and decimal degrees (39.9916),
 * with or without hemisphere letters, separated by whitespace and/or a comma.
 */
export function parseCoordinatePair(input: string): ParsedCoordinate {
  const tokens = tokenize(input)
  if (tokens.length !== 2) {
    throw new Error('Expected exactly two coordinates (latitude and longitude)')
  }

  const [a, b] = tokens
  const latToken = a.hemi === 'N' || a.hemi === 'S' ? a : b.hemi === 'N' || b.hemi === 'S' ? b : a
  const lngToken = latToken === a ? b : a

  if (latToken.hemi && latToken.hemi !== 'N' && latToken.hemi !== 'S') {
    throw new Error('Latitude must use N or S')
  }
  if (lngToken.hemi && lngToken.hemi !== 'E' && lngToken.hemi !== 'W') {
    throw new Error('Longitude must use E or W')
  }

  const lat = latToken.hemi === 'S' ? -Math.abs(latToken.value) : latToken.hemi === 'N' ? Math.abs(latToken.value) : latToken.value
  const lng = lngToken.hemi === 'W' ? -Math.abs(lngToken.value) : lngToken.hemi === 'E' ? Math.abs(lngToken.value) : lngToken.value

  if (Math.abs(lat) > 90) throw new Error('Latitude must be between -90 and 90')
  if (Math.abs(lng) > 180) throw new Error('Longitude must be between -180 and 180')

  return { lat, lng, detectedFormat: latToken.format }
}

function splitDegrees(absValue: number, subPrecision: number): { deg: number; min: number; sec: number } {
  let deg = Math.floor(absValue)
  const minFull = (absValue - deg) * 60
  let min = Math.floor(minFull)
  let sec = Number(((minFull - min) * 60).toFixed(subPrecision))
  if (sec >= 60) {
    sec = 0
    min += 1
  }
  if (min >= 60) {
    min = 0
    deg += 1
  }
  return { deg, min, sec }
}

export function toDecimalString(value: number, precision = 6): string {
  return value.toFixed(precision)
}

export function toDmsString(value: number, axis: CoordinateAxis, precision = 1): string {
  const hemi = value < 0 ? (axis === 'lat' ? 'S' : 'W') : axis === 'lat' ? 'N' : 'E'
  const { deg, min, sec } = splitDegrees(Math.abs(value), precision)
  return `${deg}°${min}'${sec.toFixed(precision)}"${hemi}`
}

export function toDdmString(value: number, axis: CoordinateAxis, precision = 3): string {
  const hemi = value < 0 ? (axis === 'lat' ? 'S' : 'W') : axis === 'lat' ? 'N' : 'E'
  let deg = Math.floor(Math.abs(value))
  let min = Number(((Math.abs(value) - deg) * 60).toFixed(precision))
  if (min >= 60) {
    min = 0
    deg += 1
  }
  return `${deg}°${min.toFixed(precision)}'${hemi}`
}

export function formatCoordinate(value: number, axis: CoordinateAxis, format: CoordinateFormat): string {
  switch (format) {
    case 'decimal':
      return toDecimalString(value)
    case 'dms':
      return toDmsString(value, axis)
    case 'ddm':
      return toDdmString(value, axis)
  }
}
