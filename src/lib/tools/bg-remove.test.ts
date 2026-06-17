import { describe, it, expect } from 'vitest'
import {
  validateFile,
  BgRemoveError,
  MAX_FILE_SIZE,
  ALLOWED_TYPES,
} from './bg-remove'

function makeFile(type: string, size = 1024): File {
  const buf = new Uint8Array(size)
  return new File([buf], 'test.img', { type })
}

describe('validateFile', () => {
  it('accepts PNG', () => {
    expect(() => validateFile(makeFile('image/png'))).not.toThrow()
  })

  it('accepts JPEG', () => {
    expect(() => validateFile(makeFile('image/jpeg'))).not.toThrow()
  })

  it('accepts WebP', () => {
    expect(() => validateFile(makeFile('image/webp'))).not.toThrow()
  })

  it('rejects unsupported format', () => {
    const err = (() => {
      try { validateFile(makeFile('image/gif')); return null }
      catch (e) { return e }
    })()
    expect(err).toBeInstanceOf(BgRemoveError)
    expect((err as BgRemoveError).kind).toBe('format')
  })

  it('rejects file exceeding MAX_FILE_SIZE', () => {
    const err = (() => {
      try { validateFile(makeFile('image/png', MAX_FILE_SIZE + 1)); return null }
      catch (e) { return e }
    })()
    expect(err).toBeInstanceOf(BgRemoveError)
    expect((err as BgRemoveError).kind).toBe('size')
  })

  it('accepts file exactly at MAX_FILE_SIZE', () => {
    expect(() => validateFile(makeFile('image/png', MAX_FILE_SIZE))).not.toThrow()
  })
})

describe('ALLOWED_TYPES', () => {
  it('contains png, jpeg, webp', () => {
    expect(ALLOWED_TYPES).toContain('image/png')
    expect(ALLOWED_TYPES).toContain('image/jpeg')
    expect(ALLOWED_TYPES).toContain('image/webp')
  })
})
