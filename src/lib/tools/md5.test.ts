import { test, expect } from 'vitest'
import { digestText, digestFile } from './md5'

test('hashes UTF-8 text to known MD5 vectors (hex)', () => {
  expect(digestText({ input: 'hello', outputEncoding: 'hex' }))
    .toBe('5d41402abc4b2a76b9719d911017c592')
})

test('hashes UTF-8 text to known MD5 vectors (base64)', () => {
  expect(digestText({ input: 'hello', outputEncoding: 'base64' }))
    .toBe('XUFAKrxLKna5cZ2REBfFkg==')
})

test('hashes abc to RFC 1321 test vector', () => {
  expect(digestText({ input: 'abc', outputEncoding: 'hex' }))
    .toBe('900150983cd24fb0d6963f7d28e17f72')
})

test('hashes empty string input throws', () => {
  expect(() => digestText({ input: '', outputEncoding: 'hex' })).toThrow(/输入为空/)
})

test('throws on unsupported text encoding', () => {
  expect(() => digestText({ input: 'hello', textEncoding: 'gbk', outputEncoding: 'hex' }))
    .toThrow(/Unsupported text encoding/)
})

test('hashes file to known MD5 hex', async () => {
  const file = new File(['hello'], 'test.txt')
  const digest = await digestFile(file, { outputEncoding: 'hex', chunkSize: 2 })
  expect(digest).toBe('5d41402abc4b2a76b9719d911017c592')
})

test('hashes file to known MD5 base64', async () => {
  const file = new File(['hello'], 'test.txt')
  const digest = await digestFile(file, { outputEncoding: 'base64', chunkSize: 3 })
  expect(digest).toBe('XUFAKrxLKna5cZ2REBfFkg==')
})

test('reports progress during file hashing', async () => {
  const file = new File(['abcdef'], 'test.txt')
  const seen: number[] = []
  await digestFile(file, {
    outputEncoding: 'hex',
    chunkSize: 2,
    onProgress(p) { seen.push(p.processedBytes) },
  })
  expect(seen).toEqual([2, 4, 6])
})

test('supports abort signal during file hashing', async () => {
  const file = new File(['abcdef'], 'test.txt')
  const controller = new AbortController()
  let callCount = 0

  await expect(digestFile(file, {
    outputEncoding: 'hex',
    chunkSize: 2,
    signal: controller.signal,
    onProgress() {
      callCount += 1
      controller.abort()
    },
  })).rejects.toThrow(/aborted/i)

  expect(callCount).toBe(1)
})
