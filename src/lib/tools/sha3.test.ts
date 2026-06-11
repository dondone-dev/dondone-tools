import { test, expect } from 'vitest'
import { digestText, digestFile } from './sha3'

const HELLO_HEX = {
  'sha3-224': 'b87f88c72702fff1748e58b87e9141a42c0dbedc29a78cb0d4a5cd81',
  'sha3-256': '3338be694f50c5f338814986cdf0686453a888b84f424d792af4b9202398f392',
  'sha3-384': '720aea11019ef06440fbf05d87aa24680a2153df3907b23631e7177ce620fa1330ff07c0fddee54699a4c3ee0ee9d887',
  'sha3-512': '75d527c368f2efe848ecf6b073a36767800805e9eef2b1857d5f984f036eb6df891d75f72d9b154518c1cd58835286d1da9a38deba3de98b5a53e5ed78a84976',
}

test('hashes UTF-8 text "hello" to known SHA-3 hex vectors', () => {
  expect(digestText({ input: 'hello', outputEncoding: 'hex' })).toEqual(HELLO_HEX)
})

test('hashes UTF-8 text "hello" to known SHA-3 base64 vectors', () => {
  const digest = digestText({ input: 'hello', outputEncoding: 'base64' })
  expect(digest['sha3-224']).toBe('uH+IxycC//F0jli4fpFBpCwNvtwpp4yw1KXNgQ==')
  expect(digest['sha3-256']).toBe('Mzi+aU9QxfM4gUmGzfBoZFOoiLhPQk15KvS5ICOY85I=')
  expect(digest['sha3-384']).toBe('cgrqEQGe8GRA+/Bdh6okaAohU985B7I2MecXfOYg+hMw/wfA/d7lRpmkw+4O6diH')
  expect(digest['sha3-512']).toBe('ddUnw2jy7+hI7Pawc6NnZ4AIBenu8rGFfV+YTwNutt+JHXX3LZsVRRjBzViDUobR2po43ro96YtaU+XteKhJdg==')
})

test('hashes file to known SHA-3 hex values', async () => {
  const file = new File(['hello'], 'test.txt')
  const digest = await digestFile(file, { outputEncoding: 'hex', chunkSize: 2 })
  expect(digest).toEqual(HELLO_HEX)
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

test('throws on empty text input', () => {
  expect(() => digestText({ input: '', outputEncoding: 'hex' })).toThrow(/输入为空/)
})

test('throws on unsupported text encoding', () => {
  expect(() => digestText({ input: 'hello', textEncoding: 'gbk', outputEncoding: 'hex' }))
    .toThrow(/Unsupported text encoding/)
})

test('throws on unsupported output encoding', () => {
  expect(() => digestText({ input: 'hello', outputEncoding: 'base32' as 'hex' }))
    .toThrow(/Unsupported output encoding/)
})
