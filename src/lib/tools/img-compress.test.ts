import { describe, it, expect } from 'vitest'
import { detectFormat, formatBytes, buildOutputFilename, resolveOutputFormat, makeUniqueFilename, createZipBundle } from './img-compress'

describe('detectFormat', () => {
  it('detects format by MIME type', () => {
    expect(detectFormat(new File([], 'f', { type: 'image/jpeg' }))).toBe('jpeg')
    expect(detectFormat(new File([], 'f', { type: 'image/png' }))).toBe('png')
    expect(detectFormat(new File([], 'f', { type: 'image/webp' }))).toBe('webp')
  })

  it('falls back to extension when MIME is absent', () => {
    expect(detectFormat(new File([], 'photo.jpg'))).toBe('jpeg')
    expect(detectFormat(new File([], 'photo.jpeg'))).toBe('jpeg')
    expect(detectFormat(new File([], 'image.PNG'))).toBe('png') // extension match is case-insensitive
    expect(detectFormat(new File([], 'anim.webp'))).toBe('webp')
  })

  it('MIME type takes precedence over extension', () => {
    expect(detectFormat(new File([], 'photo.png', { type: 'image/jpeg' }))).toBe('jpeg')
  })

  it('returns null for unsupported formats', () => {
    expect(detectFormat(new File([], 'anim.gif', { type: 'image/gif' }))).toBeNull()
    expect(detectFormat(new File([], 'doc.bmp'))).toBeNull()
  })
})

describe('formatBytes', () => {
  it('formats raw bytes', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(1)).toBe('1 B')
    expect(formatBytes(1023)).toBe('1023 B')
  })

  it('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1.0 KB')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(10240)).toBe('10.0 KB')
  })

  it('formats megabytes', () => {
    expect(formatBytes(1024 * 1024)).toBe('1.00 MB')
    expect(formatBytes(Math.round(1024 * 1024 * 2.5))).toBe('2.50 MB')
  })
})

describe('buildOutputFilename', () => {
  it('replaces the extension', () => {
    expect(buildOutputFilename('photo.jpg', 'png')).toBe('photo.png')
    expect(buildOutputFilename('image.png', 'webp')).toBe('image.webp')
    expect(buildOutputFilename('shot.webp', 'jpg')).toBe('shot.jpg')
  })

  it('handles filenames with multiple dots', () => {
    expect(buildOutputFilename('my.photo.jpg', 'webp')).toBe('my.photo.webp')
  })

  it('appends extension when original has none', () => {
    expect(buildOutputFilename('noext', 'jpg')).toBe('noext.jpg')
  })
})

describe('resolveOutputFormat', () => {
  it('returns explicit output format when not auto', () => {
    expect(resolveOutputFormat('jpeg', 'webp', false)).toBe('webp')
    expect(resolveOutputFormat('png', 'jpeg', false)).toBe('jpeg')
    expect(resolveOutputFormat('webp', 'png', false)).toBe('png')
  })

  it('preserves input format when auto', () => {
    expect(resolveOutputFormat('jpeg', 'auto', false)).toBe('jpeg')
    expect(resolveOutputFormat('png', 'auto', false)).toBe('png')
    expect(resolveOutputFormat('webp', 'auto', false)).toBe('webp')
  })

  it('converts jpeg to png when auto and lossless', () => {
    expect(resolveOutputFormat('jpeg', 'auto', true)).toBe('png')
    expect(resolveOutputFormat('png', 'auto', true)).toBe('png')
    expect(resolveOutputFormat('webp', 'auto', true)).toBe('webp')
  })
})

describe('makeUniqueFilename', () => {
  it('returns original filename if not seen before', () => {
    const seen = new Set<string>()
    expect(makeUniqueFilename('photo.jpg', seen)).toBe('photo.jpg')
    expect(seen.has('photo.jpg')).toBe(true)
  })

  it('appends incrementing index on duplicate filenames', () => {
    const seen = new Set<string>()
    expect(makeUniqueFilename('photo.jpg', seen)).toBe('photo.jpg')
    expect(makeUniqueFilename('photo.jpg', seen)).toBe('photo_1.jpg')
    expect(makeUniqueFilename('photo.jpg', seen)).toBe('photo_2.jpg')
  })

  it('handles filenames without extensions', () => {
    const seen = new Set<string>()
    expect(makeUniqueFilename('image', seen)).toBe('image')
    expect(makeUniqueFilename('image', seen)).toBe('image_1')
  })
})

describe('createZipBundle', () => {
  it('creates a non-empty zip blob from files', async () => {
    const files = [
      { name: 'test1.txt', buffer: new TextEncoder().encode('hello').buffer },
      { name: 'test2.txt', buffer: new TextEncoder().encode('world').buffer },
    ]
    const zipBlob = await createZipBundle(files)
    expect(zipBlob).toBeInstanceOf(Blob)
    expect(zipBlob.type).toBe('application/zip')
    expect(zipBlob.size).toBeGreaterThan(0)
  })

  it('handles duplicate file names gracefully', async () => {
    const files = [
      { name: 'img.jpg', buffer: new Uint8Array([1, 2, 3]).buffer },
      { name: 'img.jpg', buffer: new Uint8Array([4, 5, 6]).buffer },
    ]
    const zipBlob = await createZipBundle(files)
    expect(zipBlob.size).toBeGreaterThan(0)
  })
})
