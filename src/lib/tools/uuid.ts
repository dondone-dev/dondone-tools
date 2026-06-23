export type UuidVersion = 'v4' | 'v7'

let lastV7Ms = 0
let v7Sequence = 0

export function generateUuid(version: UuidVersion = 'v4'): string {
  return version === 'v7' ? generateUuidV7() : generateUuidV4()
}

export function generateUuids(count: number, version: UuidVersion = 'v4'): string[] {
  const n = Number.isFinite(count) ? Math.max(1, Math.min(count, 1000)) : 1
  return Array.from({ length: n }, () => generateUuid(version))
}

export function toCSV(uuids: string[]): string {
  return 'uuid\n' + uuids.join('\n')
}

function generateUuidV4(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()

  const bytes = randomBytes(16)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  return formatUuid(bytes)
}

function generateUuidV7(): string {
  const bytes = randomBytes(16)
  const now = Date.now()
  const timestamp = BigInt(now)

  bytes[0] = Number((timestamp >> 40n) & 0xffn)
  bytes[1] = Number((timestamp >> 32n) & 0xffn)
  bytes[2] = Number((timestamp >> 24n) & 0xffn)
  bytes[3] = Number((timestamp >> 16n) & 0xffn)
  bytes[4] = Number((timestamp >> 8n) & 0xffn)
  bytes[5] = Number(timestamp & 0xffn)

  if (now === lastV7Ms) {
    v7Sequence = (v7Sequence + 1) & 0x0fff
  } else {
    lastV7Ms = now
    v7Sequence = ((bytes[6] & 0x0f) << 8) | bytes[7]
  }

  bytes[6] = 0x70 | ((v7Sequence >> 8) & 0x0f)
  bytes[7] = v7Sequence & 0xff
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  return formatUuid(bytes)
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return bytes
}

function formatUuid(bytes: Uint8Array): string {
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
