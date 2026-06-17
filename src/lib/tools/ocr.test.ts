import { describe, it, expect } from 'vitest'
import { validateFile, flattenOcrResult, OcrError, ALLOWED_TYPES, MAX_FILE_SIZE } from './ocr'
import type { OcrResult } from '@paddleocr/paddleocr-js'

function makeFile(name: string, type: string, size = 100): File {
  const bytes = new Uint8Array(size)
  return new File([bytes], name, { type })
}

function makeResult(items: Array<{ poly: [number, number][]; text: string }>): OcrResult {
  return {
    image: { width: 800, height: 600 },
    items: items.map(i => ({ ...i, score: 0.9 })),
    metrics: { detMs: 0, recMs: 0, totalMs: 0, detectedBoxes: items.length, recognizedCount: items.length },
    runtime: { requestedBackend: 'wasm', detProvider: 'wasm', recProvider: 'wasm', webgpuAvailable: false },
  }
}

describe('validateFile', () => {
  it('accepts all allowed types', () => {
    for (const type of ALLOWED_TYPES) {
      expect(() => validateFile(makeFile('img', type))).not.toThrow()
    }
  })

  it('rejects unsupported format with kind=format', () => {
    let caught: unknown
    try { validateFile(makeFile('img.heic', 'image/heic')) } catch (e) { caught = e }
    expect(caught).toBeInstanceOf(OcrError)
    expect((caught as OcrError).kind).toBe('format')
  })

  it('rejects oversized file with kind=size', () => {
    let caught: unknown
    try { validateFile(makeFile('big.png', 'image/png', MAX_FILE_SIZE + 1)) } catch (e) { caught = e }
    expect(caught).toBeInstanceOf(OcrError)
    expect((caught as OcrError).kind).toBe('size')
  })

  it('accepts file exactly at size limit', () => {
    expect(() => validateFile(makeFile('ok.png', 'image/png', MAX_FILE_SIZE))).not.toThrow()
  })
})

describe('flattenOcrResult', () => {
  it('sorts items top-to-bottom by minimum poly Y', () => {
    const result = makeResult([
      { poly: [[0, 50], [100, 50], [100, 60], [0, 60]], text: 'second' },
      { poly: [[0, 10], [100, 10], [100, 20], [0, 20]], text: 'first' },
    ])
    expect(flattenOcrResult(result)).toBe('first\nsecond')
  })

  it('returns empty string for no items', () => {
    expect(flattenOcrResult(makeResult([]))).toBe('')
  })

  it('handles single item', () => {
    const result = makeResult([{ poly: [[0, 0], [10, 0], [10, 10], [0, 10]], text: 'hello' }])
    expect(flattenOcrResult(result)).toBe('hello')
  })

  it('uses minimum Y of all poly points for sort key', () => {
    // Item with a rotated box where the top-left is not the minimum Y
    const result = makeResult([
      { poly: [[20, 80], [60, 70], [80, 90], [40, 100]], text: 'lower' },
      { poly: [[10, 20], [50, 10], [70, 30], [30, 40]], text: 'upper' },
    ])
    expect(flattenOcrResult(result)).toBe('upper\nlower')
  })
})
