import { test, expect } from 'vitest'
import { blake2b, blake3 } from 'hash-wasm'
import { digestText, digestFile } from './blake'

test('hashes UTF-8 text "hello" to known BLAKE2b hex', async () => {
  const result = await digestText({ algorithm: 'blake2b', input: 'hello', outputEncoding: 'hex' })
  expect(result).toBe(await blake2b('hello'))
})

test('hashes UTF-8 text "hello" to known BLAKE3 hex', async () => {
  const result = await digestText({ algorithm: 'blake3', input: 'hello', outputEncoding: 'hex' })
  expect(result).toBe(await blake3('hello'))
})

test('hashes file with BLAKE2b and matches text digest', async () => {
  const file = new File(['hello'], 'test.txt')
  const result = await digestFile(file, { algorithm: 'blake2b', outputEncoding: 'hex', chunkSize: 2 })
  expect(result).toBe(await blake2b('hello'))
})

test('hashes file with BLAKE3 and matches text digest', async () => {
  const file = new File(['hello'], 'test.txt')
  const result = await digestFile(file, { algorithm: 'blake3', outputEncoding: 'hex', chunkSize: 2 })
  expect(result).toBe(await blake3('hello'))
})

test('hashes to base64 output', async () => {
  const hexDigest = await blake3('hello')
  const expectedBase64 = btoa(hexDigest.match(/.{2}/g)!.map((h) => String.fromCharCode(Number.parseInt(h, 16))).join(''))
  const result = await digestText({ algorithm: 'blake3', input: 'hello', outputEncoding: 'base64' })
  expect(result).toBe(expectedBase64)
})

test('reports progress during file hashing', async () => {
  const file = new File(['abcdef'], 'test.txt')
  const seen: number[] = []
  await digestFile(file, {
    algorithm: 'blake2b',
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
    algorithm: 'blake3',
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

test('throws on unsupported algorithm', async () => {
  await expect(digestText({ algorithm: 'unknown' as 'blake2b', input: 'hello', outputEncoding: 'hex' }))
    .rejects.toThrow(/Unsupported BLAKE algorithm/)
})

test('throws on empty input', async () => {
  await expect(digestText({ algorithm: 'blake2b', input: '', outputEncoding: 'hex' }))
    .rejects.toThrow(/输入为空/)
})
