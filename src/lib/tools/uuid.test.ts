import { afterEach, describe, expect, it, vi } from 'vitest'
import { generateUuid, generateUuids, toCSV } from './uuid'

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

afterEach(() => {
  vi.restoreAllMocks()
})

describe('generateUuid', () => {
  it('generates UUID v4 by default', () => {
    expect(generateUuid()).toMatch(UUID_V4)
    expect(generateUuid('v4')).toMatch(UUID_V4)
  })

  it('generates UUID v7', () => {
    expect(generateUuid('v7')).toMatch(UUID_V7)
  })

  it('embeds the millisecond timestamp in UUID v7', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

    const uuid = generateUuid('v7')
    const timestampHex = uuid.replaceAll('-', '').slice(0, 12)

    expect(Number.parseInt(timestampHex, 16)).toBe(1_700_000_000_000)
  })

  it('keeps UUID v7 batches sortable within the same millisecond', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_001)
    vi.spyOn(crypto, 'getRandomValues').mockImplementation((array) => {
      new Uint8Array(array.buffer, array.byteOffset, array.byteLength).fill(0)
      return array
    })

    const uuids = generateUuids(5, 'v7')

    expect(uuids).toEqual([...uuids].sort())
  })
})

describe('generateUuids', () => {
  it('clamps count to the supported range', () => {
    expect(generateUuids(0)).toHaveLength(1)
    expect(generateUuids(Number.NaN)).toHaveLength(1)
    expect(generateUuids(1001)).toHaveLength(1000)
  })

  it('generates batches for the selected version', () => {
    expect(generateUuids(3, 'v7')).toHaveLength(3)
    expect(generateUuids(3, 'v7').every((uuid) => UUID_V7.test(uuid))).toBe(true)
  })
})

describe('toCSV', () => {
  it('serializes UUIDs with a header', () => {
    expect(toCSV(['a', 'b'])).toBe('uuid\na\nb')
  })
})
