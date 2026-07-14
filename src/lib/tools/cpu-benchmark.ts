export const BENCHMARK_VERSION = 'CPU-WASM v1 Baseline' as const
export const BENCHMARK_SEED = 0xd0d02026
export const BENCHMARK_DURATIONS = [10_000, 30_000, 60_000, 300_000] as const

export type BenchmarkDurationMs = (typeof BENCHMARK_DURATIONS)[number]
export type BenchmarkRating = 'basic' | 'good' | 'excellent' | 'exceptional'

export type BenchmarkPhase =
  | 'idle'
  | 'loading'
  | 'validating'
  | 'warming'
  | 'countdown'
  | 'running'
  | 'completed'
  | 'cancelled'
  | 'invalid'
  | 'error'

export type BenchmarkSample = {
  elapsedMs: number
  completedUnits: number
  checksum: number
}

export type BenchmarkMetrics = {
  score: number
  averageRate: number
  peakRate: number
  endingRate: number
  sustainedPercent: number
  variationPercent: number
  stabilityPercent: number
}

export type BenchmarkResult = BenchmarkMetrics & {
  version: typeof BENCHMARK_VERSION
  durationMs: BenchmarkDurationMs
  effectiveMs: number
  completedUnits: number
  checksum: string
  samples: BenchmarkSample[]
}

export type BenchmarkInvalidReason = 'background' | 'checksum'

export type BenchmarkState = {
  phase: BenchmarkPhase
  durationMs: BenchmarkDurationMs
  countdown: number | null
  samples: BenchmarkSample[]
  result: BenchmarkResult | null
  invalidReason: BenchmarkInvalidReason | null
  error: string | null
}

export const initialBenchmarkState: BenchmarkState = {
  phase: 'idle',
  durationMs: 30_000,
  countdown: null,
  samples: [],
  result: null,
  invalidReason: null,
  error: null,
}

export type BenchmarkAction =
  | { type: 'start'; durationMs: BenchmarkDurationMs }
  | { type: 'phase'; phase: Extract<BenchmarkPhase, 'validating' | 'warming' | 'running'> }
  | { type: 'countdown'; value: number }
  | { type: 'progress'; sample: BenchmarkSample }
  | { type: 'complete'; result: BenchmarkResult }
  | { type: 'cancel' }
  | { type: 'invalid'; reason: BenchmarkInvalidReason }
  | { type: 'error'; message: string }
  | { type: 'reset' }

const ACTIVE_PHASES: BenchmarkPhase[] = ['loading', 'validating', 'warming', 'countdown', 'running']

export function benchmarkReducer(state: BenchmarkState, action: BenchmarkAction): BenchmarkState {
  if (action.type === 'start') {
    return {
      ...initialBenchmarkState,
      phase: 'loading',
      durationMs: action.durationMs,
    }
  }
  if (action.type === 'reset') return initialBenchmarkState
  if (action.type === 'phase' && ACTIVE_PHASES.includes(state.phase)) {
    return { ...state, phase: action.phase, countdown: null }
  }
  if (action.type === 'countdown' && ACTIVE_PHASES.includes(state.phase)) {
    return { ...state, phase: 'countdown', countdown: action.value }
  }
  if (action.type === 'progress' && state.phase === 'running') {
    return { ...state, samples: [...state.samples, action.sample] }
  }
  if (action.type === 'complete' && state.phase === 'running') {
    return { ...state, phase: 'completed', result: action.result, samples: action.result.samples }
  }
  if (action.type === 'cancel' && ACTIVE_PHASES.includes(state.phase)) {
    return { ...state, phase: 'cancelled', countdown: null }
  }
  if (action.type === 'invalid' && ACTIVE_PHASES.includes(state.phase)) {
    return { ...state, phase: 'invalid', invalidReason: action.reason, countdown: null }
  }
  if (action.type === 'error' && ACTIVE_PHASES.includes(state.phase)) {
    return { ...state, phase: 'error', error: action.message, countdown: null }
  }
  return state
}

function round(value: number, digits = 3): number {
  if (!Number.isFinite(value)) return 0
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function unitsAt(samples: BenchmarkSample[], elapsedMs: number): number {
  if (samples.length === 0 || elapsedMs <= 0) return 0
  const first = samples[0]
  if (elapsedMs <= first.elapsedMs) {
    if (first.elapsedMs === 0) return first.completedUnits
    return first.completedUnits * (elapsedMs / first.elapsedMs)
  }

  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1]
    const current = samples[index]
    if (elapsedMs <= current.elapsedMs) {
      const span = current.elapsedMs - previous.elapsedMs
      if (span <= 0) return current.completedUnits
      const progress = (elapsedMs - previous.elapsedMs) / span
      return previous.completedUnits + (current.completedUnits - previous.completedUnits) * progress
    }
  }
  return samples[samples.length - 1].completedUnits
}

function rateBetween(samples: BenchmarkSample[], startMs: number, endMs: number): number {
  const elapsedSeconds = (endMs - startMs) / 1000
  if (elapsedSeconds <= 0) return 0
  return (unitsAt(samples, endMs) - unitsAt(samples, startMs)) / elapsedSeconds
}

export function calculateBenchmarkMetrics(
  samples: BenchmarkSample[],
  effectiveMs: number,
  completedUnits: number,
): BenchmarkMetrics {
  if (effectiveMs <= 0 || completedUnits <= 0) {
    return {
      score: 0,
      averageRate: 0,
      peakRate: 0,
      endingRate: 0,
      sustainedPercent: 0,
      variationPercent: 0,
      stabilityPercent: 0,
    }
  }

  const normalized = samples[0]?.elapsedMs === 0
    ? samples
    : [{ elapsedMs: 0, completedUnits: 0, checksum: 0 }, ...samples]
  const averageRate = completedUnits / (effectiveMs / 1000)
  const fifth = effectiveMs * 0.2
  const initialRate = rateBetween(normalized, 0, fifth)
  const endingRate = rateBetween(normalized, effectiveMs - fifth, effectiveMs)
  const rollingRates = normalized
    .filter((sample) => sample.elapsedMs >= Math.min(1000, effectiveMs))
    .map((sample) => {
      const end = Math.min(sample.elapsedMs, effectiveMs)
      return rateBetween(normalized, Math.max(0, end - 1000), end)
    })
    .filter((rate) => Number.isFinite(rate) && rate >= 0)
  if (rollingRates.length === 0) rollingRates.push(averageRate)

  const rollingMean = rollingRates.reduce((sum, rate) => sum + rate, 0) / rollingRates.length
  const variance = rollingRates.reduce((sum, rate) => sum + (rate - rollingMean) ** 2, 0) / rollingRates.length
  const variationPercent = rollingMean > 0 ? round((Math.sqrt(variance) / rollingMean) * 100) : 0

  return {
    score: Math.round(averageRate * 1000),
    averageRate: round(averageRate),
    peakRate: round(Math.max(...rollingRates)),
    endingRate: round(endingRate),
    sustainedPercent: initialRate > 0 ? round((endingRate / initialRate) * 100) : 0,
    variationPercent,
    stabilityPercent: round(Math.max(0, 100 - variationPercent)),
  }
}

export function calculateEstimatedScore(samples: BenchmarkSample[]): number {
  if (samples.length < 2) return 0
  const latest = samples[samples.length - 1]
  const startMs = Math.max(0, latest.elapsedMs - 3000)
  return Math.round(rateBetween(samples, startMs, latest.elapsedMs) * 1000)
}

export function getBenchmarkRating(score: number): BenchmarkRating {
  if (score < 250_000) return 'basic'
  if (score < 400_000) return 'good'
  if (score < 600_000) return 'excellent'
  return 'exceptional'
}

export type BenchmarkEnvironment = {
  browser: string
  operatingSystem: string
  logicalProcessors: number | null
  wasmSimdSupported: boolean
  crossOriginIsolated: boolean
}

function versionMatch(userAgent: string, pattern: RegExp): string | null {
  return userAgent.match(pattern)?.[1] ?? null
}

export function detectBrowser(userAgent: string): string {
  const edge = versionMatch(userAgent, /Edg\/(\d+)/)
  if (edge) return `Microsoft Edge ${edge}`
  const firefox = versionMatch(userAgent, /Firefox\/(\d+)/)
  if (firefox) return `Firefox ${firefox}`
  const chrome = versionMatch(userAgent, /(?:Chrome|CriOS)\/(\d+)/)
  if (chrome) return `Chrome ${chrome}`
  const safari = versionMatch(userAgent, /Version\/(\d+(?:\.\d+)?).*Safari/)
  if (safari) return `Safari ${safari}`
  return 'Unknown'
}

export function detectOperatingSystem(userAgent: string): string {
  const android = versionMatch(userAgent, /Android\s([\d.]+)/)
  if (android) return `Android ${android}`
  const ios = versionMatch(userAgent, /(?:iPhone OS|CPU OS)\s([\d_]+)/)
  if (ios) return `iOS ${ios.replaceAll('_', '.')}`
  if (/Windows NT/.test(userAgent)) return 'Windows'
  const mac = versionMatch(userAgent, /Mac OS X\s([\d_]+)/)
  if (mac) return `macOS ${mac.replaceAll('_', '.')}`
  if (/Linux/.test(userAgent)) return 'Linux'
  return 'Unknown'
}

export type BenchmarkWorkerRequest = {
  type: 'start'
  durationMs: BenchmarkDurationMs
}

export type BenchmarkWorkerEvent =
  | { type: 'phase'; phase: 'validating' | 'warming' }
  | { type: 'countdown'; value: number }
  | { type: 'running' }
  | { type: 'progress'; sample: BenchmarkSample }
  | { type: 'complete'; result: BenchmarkResult }
  | { type: 'invalid'; reason: 'checksum' }
  | { type: 'error'; message: string }
