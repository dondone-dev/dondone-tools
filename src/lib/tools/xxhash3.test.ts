import { test, expect } from 'vitest'
import { xxhash3, xxhash128 } from 'hash-wasm'
import { digestText, digestFile } from './xxhash3'

test('hashes UTF-8 text "hello" to known xxHash3 hex values', async () => {
  const digest = await digestText({ input: 'hello', outputEncoding: 'hex' })
  expect(digest['xxhash3-64']).toBe(await xxhash3('hello'))
  expect(digest['xxhash3-128']).toBe(await xxhash128('hello'))
})

test('hashes file to xxHash3 values matching text digest', async () => {
  const file = new File(['hello'], 'test.txt')
  const digest = await digestFile(file, { outputEncoding: 'hex', chunkSize: 2 })
  expect(digest['xxhash3-64']).toBe(await xxhash3('hello'))
  expect(digest['xxhash3-128']).toBe(await xxhash128('hello'))
})

test('outputs base64 encoding for both algorithms', async () => {
  const hexToBase64 = (hex: string) =>
    btoa(hex.match(/.{2}/g)!.map((h) => String.fromCharCode(Number.parseInt(h, 16))).join(''))

  const digest = await digestText({ input: 'hello', outputEncoding: 'base64' })
  expect(digest['xxhash3-64']).toBe(hexToBase64(await xxhash3('hello')))
  expect(digest['xxhash3-128']).toBe(hexToBase64(await xxhash128('hello')))
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

test('throws on empty input', async () => {
  await expect(digestText({ input: '', outputEncoding: 'hex' }))
    .rejects.toThrow(/输入为空/)
})
