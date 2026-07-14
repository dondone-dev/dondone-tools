import { describe, expect, it } from 'vitest'
import {
  BENCHMARK_VERSION,
  benchmarkReducer,
  calculateBenchmarkMetrics,
  calculateEstimatedScore,
  detectBrowser,
  detectOperatingSystem,
  getBenchmarkRating,
  initialBenchmarkState,
  type BenchmarkSample,
} from './cpu-benchmark'

function constantSamples(seconds: number, unitsPerSecond: number): BenchmarkSample[] {
  return Array.from({ length: seconds + 1 }, (_, second) => ({
    elapsedMs: second * 1000,
    completedUnits: second * unitsPerSecond,
    checksum: second,
  }))
}

describe('calculateBenchmarkMetrics', () => {
  it('calculates a perfectly stable constant-rate result', () => {
    const metrics = calculateBenchmarkMetrics(constantSamples(10, 6), 10_000, 60)

    expect(metrics).toEqual({
      score: 6000,
      averageRate: 6,
      peakRate: 6,
      endingRate: 6,
      sustainedPercent: 100,
      variationPercent: 0,
      stabilityPercent: 100,
    })
  })

  it('compares the final and initial fifths of the run', () => {
    const samples: BenchmarkSample[] = [
      { elapsedMs: 0, completedUnits: 0, checksum: 0 },
      { elapsedMs: 2000, completedUnits: 20, checksum: 1 },
      { elapsedMs: 8000, completedUnits: 68, checksum: 2 },
      { elapsedMs: 10_000, completedUnits: 84, checksum: 3 },
    ]

    const metrics = calculateBenchmarkMetrics(samples, 10_000, 84)

    expect(metrics.score).toBe(8400)
    expect(metrics.endingRate).toBe(8)
    expect(metrics.sustainedPercent).toBe(80)
    expect(metrics.variationPercent).toBeGreaterThan(0)
    expect(metrics.stabilityPercent).toBe(100 - metrics.variationPercent)
  })

  it('returns finite zero metrics when no work completed', () => {
    const metrics = calculateBenchmarkMetrics([], 0, 0)

    expect(Object.values(metrics).every(Number.isFinite)).toBe(true)
    expect(metrics.score).toBe(0)
    expect(metrics.stabilityPercent).toBe(0)
  })

  it('uses the effective time when the final complete block crosses the target', () => {
    const samples: BenchmarkSample[] = [
      { elapsedMs: 0, completedUnits: 0, checksum: 0 },
      { elapsedMs: 10_020, completedUnits: 101, checksum: 1 },
    ]

    const metrics = calculateBenchmarkMetrics(samples, 10_020, 101)

    expect(metrics.score).toBe(Math.round((101 / 10.02) * 1000))
    expect(metrics.averageRate).toBeCloseTo(101 / 10.02, 3)
  })
})

describe('calculateEstimatedScore', () => {
  it('uses only the latest three seconds', () => {
    const samples: BenchmarkSample[] = [
      { elapsedMs: 0, completedUnits: 0, checksum: 0 },
      { elapsedMs: 3000, completedUnits: 6, checksum: 1 },
      { elapsedMs: 6000, completedUnits: 24, checksum: 2 },
    ]

    expect(calculateEstimatedScore(samples)).toBe(6000)
  })
})

describe('getBenchmarkRating', () => {
  it('classifies every score threshold boundary', () => {
    expect(getBenchmarkRating(0)).toBe('basic')
    expect(getBenchmarkRating(249_999)).toBe('basic')
    expect(getBenchmarkRating(250_000)).toBe('good')
    expect(getBenchmarkRating(399_999)).toBe('good')
    expect(getBenchmarkRating(400_000)).toBe('excellent')
    expect(getBenchmarkRating(599_999)).toBe('excellent')
    expect(getBenchmarkRating(600_000)).toBe('exceptional')
  })
})

describe('benchmarkReducer', () => {
  it('follows the valid run lifecycle and retains the selected duration', () => {
    const loading = benchmarkReducer(initialBenchmarkState, { type: 'start', durationMs: 60_000 })
    const validating = benchmarkReducer(loading, { type: 'phase', phase: 'validating' })
    const running = benchmarkReducer(validating, { type: 'phase', phase: 'running' })
    const progressed = benchmarkReducer(running, {
      type: 'progress',
      sample: { elapsedMs: 1000, completedUnits: 5, checksum: 123 },
    })

    expect(progressed.phase).toBe('running')
    expect(progressed.durationMs).toBe(60_000)
    expect(progressed.samples).toHaveLength(1)
    expect(BENCHMARK_VERSION).toBe('CPU-WASM v1 Baseline')
  })

  it('ignores progress outside the running phase', () => {
    const next = benchmarkReducer(initialBenchmarkState, {
      type: 'progress',
      sample: { elapsedMs: 1000, completedUnits: 5, checksum: 123 },
    })

    expect(next).toBe(initialBenchmarkState)
  })

  it('marks an active run invalid and resets it', () => {
    const running = benchmarkReducer(
      benchmarkReducer(initialBenchmarkState, { type: 'start', durationMs: 30_000 }),
      { type: 'phase', phase: 'running' },
    )
    const invalid = benchmarkReducer(running, { type: 'invalid', reason: 'background' })

    expect(invalid.phase).toBe('invalid')
    expect(invalid.invalidReason).toBe('background')
    expect(benchmarkReducer(invalid, { type: 'reset' })).toEqual(initialBenchmarkState)
  })

  it('rejects terminal events that do not follow an active run', () => {
    const completed = benchmarkReducer(initialBenchmarkState, {
      type: 'complete',
      result: {
        version: BENCHMARK_VERSION,
        durationMs: 10_000,
        effectiveMs: 10_000,
        completedUnits: 1,
        score: 100,
        averageRate: 0.1,
        peakRate: 0.1,
        endingRate: 0.1,
        sustainedPercent: 100,
        variationPercent: 0,
        stabilityPercent: 100,
        checksum: '00000001',
        samples: [],
      },
    })

    expect(completed).toBe(initialBenchmarkState)
  })
})

describe('environment detection', () => {
  it('detects Chromium browsers without confusing Edge with Chrome', () => {
    const edge = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0'

    expect(detectBrowser(edge)).toBe('Microsoft Edge 131')
    expect(detectOperatingSystem(edge)).toBe('Windows')
  })

  it('detects Safari and macOS versions', () => {
    const safari = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.2 Safari/605.1.15'

    expect(detectBrowser(safari)).toBe('Safari 18.2')
    expect(detectOperatingSystem(safari)).toBe('macOS 10.15.7')
  })
})
