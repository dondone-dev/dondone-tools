import { test, expect } from 'vitest'
import { digestText, digestFile } from './sha2'

const HELLO_HEX = {
  sha224: 'ea09ae9cc6768c50fcee903ed054556e5bfc8347907f12598aa24193',
  sha256: '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
  sha384: '59e1748777448c69de6b800d7a33bbfb9ff1b463e44354c3553bcdb9c666fa90125a3c79f90397bdf5f6a13de828684f',
  sha512: '9b71d224bd62f3785d96d46ad3ea3d73319bfbc2890caadae2dff72519673ca72323c3d99ba5c11d7c7acc6e14b8c5da0c4663475c2e5c3adef46f73bcdec043',
}

test('hashes UTF-8 text "hello" to known SHA-2 hex vectors', () => {
  expect(digestText({ input: 'hello', outputEncoding: 'hex' })).toEqual(HELLO_HEX)
})

test('hashes UTF-8 text "hello" to known SHA-2 base64 vectors', () => {
  const digest = digestText({ input: 'hello', outputEncoding: 'base64' })
  expect(digest.sha224).toBe('6gmunMZ2jFD87pA+0FRVblv8g0eQfxJZiqJBkw==')
  expect(digest.sha256).toBe('LPJNul+wow4m6DsqxbninhsWHlwfp0JecwQzYpOLmCQ=')
  expect(digest.sha384).toBe('WeF0h3dEjGnea4ANejO7+5/xtGPkQ1TDVTvNucZm+pASWjx5+QOXvfX2oT3oKGhP')
  expect(digest.sha512).toBe('m3HSJL1i83hdltRq0+o9czGb+8KJDKra4t/3JRlnPKcjI8PZm6XBHXx6zG4UuMXaDEZjR1wuXDre9G9zvN7AQw==')
})

test('hashes file to known SHA-2 hex values', async () => {
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
