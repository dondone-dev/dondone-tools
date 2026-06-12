export function isMilliseconds(ts: number): boolean {
  return ts >= 1e12
}

export function fromUnix(ts: number): { iso: string; local: string; utc: string; relative: string } {
  const ms = isMilliseconds(ts) ? ts : ts * 1000
  const date = new Date(ms)
  if (isNaN(date.getTime())) throw new Error('Invalid timestamp')

  return {
    iso: date.toISOString(),
    local: date.toLocaleString(),
    utc: date.toUTCString(),
    relative: getRelative(date),
  }
}

export function toUnix(input: string): { seconds: number; milliseconds: number } {
  const date = new Date(input.trim())
  if (isNaN(date.getTime())) throw new Error('Invalid date string')
  const ms = date.getTime()
  return { seconds: Math.floor(ms / 1000), milliseconds: ms }
}

function getRelative(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const diffSec = Math.round(diffMs / 1000)
  const absSec = Math.abs(diffSec)
  const future = diffSec < 0

  const units: [number, string][] = [
    [60, 'second'],
    [3600, 'minute'],
    [86400, 'hour'],
    [86400 * 30, 'day'],
    [86400 * 365, 'month'],
    [Infinity, 'year'],
  ]

  let value: number
  let unit: string

  if (absSec < 60) {
    value = absSec
    unit = 'second'
  } else if (absSec < 3600) {
    value = Math.round(absSec / 60)
    unit = 'minute'
  } else if (absSec < 86400) {
    value = Math.round(absSec / 3600)
    unit = 'hour'
  } else if (absSec < 86400 * 30) {
    value = Math.round(absSec / 86400)
    unit = 'day'
  } else if (absSec < 86400 * 365) {
    value = Math.round(absSec / (86400 * 30))
    unit = 'month'
  } else {
    value = Math.round(absSec / (86400 * 365))
    unit = 'year'
  }

  // suppress unused import warning
  void units

  const plural = value !== 1 ? 's' : ''
  return future ? `in ${value} ${unit}${plural}` : `${value} ${unit}${plural} ago`
}
