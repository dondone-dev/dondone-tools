import { describe, it, expect } from 'vitest'
import { detectFormat, formatBytes, buildOutputFilename } from './img-compress'

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
