import { describe, expect, it } from 'vitest'
import {
  analyzeRenderedPixels,
  evaluateAggregate,
  evaluateLanguageSignal,
  evaluateTimeZoneSignal,
  evaluateUtcOffsetSignal,
  type ChinaDetectorOptions,
  type SignalResult,
} from './china-user-detector'

describe('analyzeRenderedPixels', () => {
  it('detects empty rendered output', () => {
    const result = analyzeRenderedPixels(new Uint8ClampedArray([
      0, 0, 0, 0,
      0, 0, 0, 0,
    ]))
    expect(result.opaquePixelCount).toBe(0)
    expect(result.isMonochrome).toBe(true)
  })

  it('detects monochrome rendered output', () => {
    const result = analyzeRenderedPixels(new Uint8ClampedArray([
      10, 10, 10, 255,
      80, 80, 80, 255,
    ]))
    expect(result.opaquePixelCount).toBe(2)
    expect(result.isMonochrome).toBe(true)
  })

  it('detects color rendered output', () => {
    const result = analyzeRenderedPixels(new Uint8ClampedArray([
      10, 10, 10, 255,
      255, 80, 20, 255,
    ]))
    expect(result.opaquePixelCount).toBe(2)
    expect(result.isMonochrome).toBe(false)
  })
})

describe('evaluateLanguageSignal', () => {
  it('matches zh-CN in mainland mode', () => {
    const result = evaluateLanguageSignal(['en-US', 'zh-CN'], { mode: 'mainland', strict: false })
    expect(result.status).toBe('match')
    expect(result.score).toBe(3)
  })

  it('matches zh-TW in greater-china mode', () => {
    const result = evaluateLanguageSignal(['zh-TW'], { mode: 'greater-china', strict: false })
    expect(result.status).toBe('match')
    expect(result.score).toBe(3)
  })

  it('rejects zh-TW in mainland mode', () => {
    const result = evaluateLanguageSignal(['zh-TW'], { mode: 'mainland', strict: false })
    expect(result.status).toBe('miss')
    expect(result.score).toBe(0)
  })

  it('matches zh-HK in greater-china mode', () => {
    const result = evaluateLanguageSignal(['zh-HK'], { mode: 'greater-china', strict: false })
    expect(result.status).toBe('match')
  })

  it('rejects zh-HK in mainland mode', () => {
    const result = evaluateLanguageSignal(['zh-HK'], { mode: 'mainland', strict: false })
    expect(result.status).toBe('miss')
  })

  it('strict mode only checks first language', () => {
    const result = evaluateLanguageSignal(['en-US', 'zh-CN'], { mode: 'mainland', strict: true })
    expect(result.status).toBe('miss')
  })

  it('strict mode matches when zh-CN is first', () => {
    const result = evaluateLanguageSignal(['zh-CN', 'en-US'], { mode: 'mainland', strict: true })
    expect(result.status).toBe('match')
  })

  it('returns unknown for empty languages', () => {
    const result = evaluateLanguageSignal([], { mode: 'mainland', strict: false })
    expect(result.status).toBe('unknown')
  })

  it('matches bare zh tag in mainland mode', () => {
    const result = evaluateLanguageSignal(['zh'], { mode: 'mainland', strict: false })
    expect(result.status).toBe('match')
  })

  it('is case-insensitive', () => {
    const result = evaluateLanguageSignal(['ZH-CN'], { mode: 'mainland', strict: false })
    expect(result.status).toBe('match')
  })
})

describe('evaluateTimeZoneSignal', () => {
  it('matches Asia/Shanghai in mainland mode', () => {
    const result = evaluateTimeZoneSignal('Asia/Shanghai', { mode: 'mainland', strict: false })
    expect(result.status).toBe('match')
    expect(result.score).toBe(3)
  })

  it('matches Asia/Taipei in greater-china mode', () => {
    const result = evaluateTimeZoneSignal('Asia/Taipei', { mode: 'greater-china', strict: false })
    expect(result.status).toBe('match')
  })

  it('rejects Asia/Taipei in mainland mode', () => {
    const result = evaluateTimeZoneSignal('Asia/Taipei', { mode: 'mainland', strict: false })
    expect(result.status).toBe('miss')
  })

  it('matches PRC in mainland mode', () => {
    const result = evaluateTimeZoneSignal('PRC', { mode: 'mainland', strict: false })
    expect(result.status).toBe('match')
  })

  it('returns unknown for undefined timezone', () => {
    const result = evaluateTimeZoneSignal(undefined, { mode: 'mainland', strict: false })
    expect(result.status).toBe('unknown')
  })

  it('rejects America/New_York', () => {
    const result = evaluateTimeZoneSignal('America/New_York', { mode: 'greater-china', strict: false })
    expect(result.status).toBe('miss')
  })

  it('is case-insensitive', () => {
    const result = evaluateTimeZoneSignal('asia/shanghai', { mode: 'mainland', strict: false })
    expect(result.status).toBe('match')
  })
})

describe('evaluateUtcOffsetSignal', () => {
  it('matches UTC+8 (offset -480) in non-strict mode', () => {
    const result = evaluateUtcOffsetSignal(-480, { mode: 'mainland', strict: false })
    expect(result.status).toBe('match')
    expect(result.score).toBe(1)
  })

  it('rejects non-UTC+8 offset', () => {
    const result = evaluateUtcOffsetSignal(-300, { mode: 'mainland', strict: false })
    expect(result.status).toBe('miss')
    expect(result.score).toBe(0)
  })

  it('returns unavailable in strict mode', () => {
    const result = evaluateUtcOffsetSignal(-480, { mode: 'mainland', strict: true })
    expect(result.status).toBe('unavailable')
    expect(result.maxScore).toBe(0)
  })
})

describe('evaluateAggregate', () => {
  const baseOptions: ChinaDetectorOptions = { mode: 'mainland', strict: false }

  function makeSignal(overrides: Partial<SignalResult> & { id: SignalResult['id'] }): SignalResult {
    return {
      status: 'miss',
      score: 0,
      maxScore: 3,
      observed: [],
      reasonKey: 'test',
      ...overrides,
    }
  }

  it('returns high confidence when score >= 7', () => {
    const signals: SignalResult[] = [
      makeSignal({ id: 'language', status: 'match', score: 3 }),
      makeSignal({ id: 'timezone', status: 'match', score: 3 }),
      makeSignal({ id: 'utc-offset', status: 'match', score: 1, maxScore: 1 }),
    ]
    const result = evaluateAggregate(signals, baseOptions)
    expect(result.confidence).toBe('high')
    expect(result.resultKey).toBe('mainlandLikely')
    expect(result.score).toBe(7)
  })

  it('returns high confidence with network match + local match', () => {
    const signals: SignalResult[] = [
      makeSignal({ id: 'language', status: 'match', score: 3 }),
      makeSignal({ id: 'timezone', status: 'miss', score: 0 }),
      makeSignal({ id: 'network', status: 'match', score: 4, maxScore: 4 }),
    ]
    const result = evaluateAggregate(signals, baseOptions)
    expect(result.confidence).toBe('high')
  })

  it('returns medium confidence for score 4-6', () => {
    const signals: SignalResult[] = [
      makeSignal({ id: 'language', status: 'match', score: 3 }),
      makeSignal({ id: 'utc-offset', status: 'match', score: 1, maxScore: 1 }),
      makeSignal({ id: 'timezone', status: 'miss', score: 0 }),
    ]
    const result = evaluateAggregate(signals, baseOptions)
    expect(result.confidence).toBe('medium')
    expect(result.resultKey).toBe('someSignals')
  })

  it('returns low confidence for score 1-3', () => {
    const signals: SignalResult[] = [
      makeSignal({ id: 'language', status: 'miss', score: 0 }),
      makeSignal({ id: 'utc-offset', status: 'match', score: 1, maxScore: 1 }),
    ]
    const result = evaluateAggregate(signals, baseOptions)
    expect(result.confidence).toBe('low')
    expect(result.resultKey).toBe('noStrongSignals')
  })

  it('returns unknown when score is 0 with multiple unavailable signals', () => {
    const signals: SignalResult[] = [
      makeSignal({ id: 'language', status: 'unknown', score: 0 }),
      makeSignal({ id: 'timezone', status: 'unavailable', score: 0 }),
      makeSignal({ id: 'emoji', status: 'unavailable', score: 0, maxScore: 2 }),
    ]
    const result = evaluateAggregate(signals, baseOptions)
    expect(result.confidence).toBe('unknown')
    expect(result.resultKey).toBe('unknown')
  })

  it('uses greaterChinaLikely for greater-china mode with high confidence', () => {
    const signals: SignalResult[] = [
      makeSignal({ id: 'language', status: 'match', score: 3 }),
      makeSignal({ id: 'timezone', status: 'match', score: 3 }),
      makeSignal({ id: 'utc-offset', status: 'match', score: 1, maxScore: 1 }),
    ]
    const result = evaluateAggregate(signals, { mode: 'greater-china', strict: false })
    expect(result.resultKey).toBe('greaterChinaLikely')
  })

  it('calculates maxScore from all signals', () => {
    const signals: SignalResult[] = [
      makeSignal({ id: 'language', maxScore: 3, score: 3, status: 'match' }),
      makeSignal({ id: 'timezone', maxScore: 3, score: 0 }),
      makeSignal({ id: 'utc-offset', maxScore: 1, score: 0 }),
      makeSignal({ id: 'emoji', maxScore: 2, score: 0 }),
      makeSignal({ id: 'font', maxScore: 1, score: 0 }),
    ]
    const result = evaluateAggregate(signals, baseOptions)
    expect(result.maxScore).toBe(10)
  })
})
