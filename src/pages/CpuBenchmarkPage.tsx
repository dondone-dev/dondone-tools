import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Activity, AlertTriangle, Check, CheckCircle2, Copy, Cpu, Info, Loader2, RotateCcw, ShieldCheck, Square, Zap } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { simd } from 'wasm-feature-detect'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useClipboard } from '@/hooks/useClipboard'
import {
  BENCHMARK_DURATIONS,
  BENCHMARK_VERSION,
  benchmarkReducer,
  calculateEstimatedScore,
  detectBrowser,
  detectOperatingSystem,
  getBenchmarkRating,
  initialBenchmarkState,
  type BenchmarkDurationMs,
  type BenchmarkEnvironment,
  type BenchmarkPhase,
  type BenchmarkResult,
  type BenchmarkSample,
  type BenchmarkWorkerEvent,
} from '@/lib/tools/cpu-benchmark'

const ACTIVE_PHASES: BenchmarkPhase[] = ['loading', 'validating', 'warming', 'countdown', 'running']

function formatRate(value: number): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatPercent(value: number): string {
  return `${value.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
}

function durationKey(durationMs: BenchmarkDurationMs): string {
  if (durationMs === 10_000) return 'quick'
  if (durationMs === 30_000) return 'standard'
  if (durationMs === 60_000) return 'stable'
  return 'stress'
}

function createRateSeries(samples: BenchmarkSample[]): Array<{ elapsed: number; rate: number }> {
  const series: Array<{ elapsed: number; rate: number }> = []
  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1]
    const current = samples[index]
    const elapsedSeconds = (current.elapsedMs - previous.elapsedMs) / 1000
    if (elapsedSeconds <= 0) continue
    series.push({
      elapsed: current.elapsedMs / 1000,
      rate: (current.completedUnits - previous.completedUnits) / elapsedSeconds,
    })
  }
  return series
}

export function CpuBenchmarkPage() {
  const { t } = useTranslation('tools')
  const [state, dispatch] = useReducer(benchmarkReducer, initialBenchmarkState)
  const [selectedDuration, setSelectedDuration] = useState<BenchmarkDurationMs>(30_000)
  const [environment, setEnvironment] = useState<BenchmarkEnvironment | null>(null)
  const workerRef = useRef<Worker | null>(null)
  const { copiedText, copy } = useClipboard()
  const active = ACTIVE_PHASES.includes(state.phase)

  useEffect(() => {
    let cancelled = false
    const userAgent = navigator.userAgent
    simd().catch(() => false).then((wasmSimdSupported) => {
      if (cancelled) return
      setEnvironment({
        browser: detectBrowser(userAgent),
        operatingSystem: detectOperatingSystem(userAgent),
        logicalProcessors: navigator.hardwareConcurrency || null,
        wasmSimdSupported,
        crossOriginIsolated: globalThis.crossOriginIsolated === true,
      })
    })
    return () => { cancelled = true }
  }, [])

  const terminateWorker = useCallback(() => {
    workerRef.current?.terminate()
    workerRef.current = null
  }, [])

  useEffect(() => terminateWorker, [terminateWorker])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== 'hidden' || !workerRef.current) return
      terminateWorker()
      dispatch({ type: 'invalid', reason: 'background' })
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [terminateWorker])

  const start = useCallback(() => {
    dispatch({ type: 'start', durationMs: selectedDuration })
    if (typeof Worker === 'undefined' || typeof WebAssembly === 'undefined') {
      dispatch({ type: 'error', message: 'unsupported' })
      return
    }

    terminateWorker()
    const worker = new Worker(new URL('../lib/tools/cpu-benchmark.worker.ts', import.meta.url), { type: 'module' })
    workerRef.current = worker
    worker.onmessage = (event: MessageEvent<BenchmarkWorkerEvent>) => {
      const message = event.data
      if (message.type === 'phase') dispatch({ type: 'phase', phase: message.phase })
      if (message.type === 'countdown') dispatch({ type: 'countdown', value: message.value })
      if (message.type === 'running') dispatch({ type: 'phase', phase: 'running' })
      if (message.type === 'progress') dispatch({ type: 'progress', sample: message.sample })
      if (message.type === 'complete') {
        dispatch({ type: 'complete', result: message.result })
        terminateWorker()
      }
      if (message.type === 'invalid') {
        dispatch({ type: 'invalid', reason: message.reason })
        terminateWorker()
      }
      if (message.type === 'error') {
        dispatch({ type: 'error', message: message.message })
        terminateWorker()
      }
    }
    worker.onerror = () => {
      dispatch({ type: 'error', message: 'worker' })
      terminateWorker()
    }
    worker.postMessage({ type: 'start', durationMs: selectedDuration })
  }, [selectedDuration, terminateWorker])

  const stop = useCallback(() => {
    terminateWorker()
    dispatch({ type: 'cancel' })
  }, [terminateWorker])

  const copyResult = useCallback(() => {
    if (!state.result) return
    const result = state.result
    const rating = getBenchmarkRating(result.score)
    const lines = [
      `${t('cpu-benchmark.title')}: ${result.score.toLocaleString()}`,
      `${t('cpu-benchmark.rating.label')}: ${t(`cpu-benchmark.rating.${rating}`)}`,
      `${t('cpu-benchmark.averageRate')}: ${formatRate(result.averageRate)} ${t('cpu-benchmark.unitsPerSecond')}`,
      `${t('cpu-benchmark.sustained')}: ${formatPercent(result.sustainedPercent)}`,
      `${t('cpu-benchmark.stability')}: ${formatPercent(result.stabilityPercent)}`,
      `${t('cpu-benchmark.completedUnits')}: ${result.completedUnits.toLocaleString()}`,
      `${t('cpu-benchmark.version')}: ${result.version}`,
      `${t('cpu-benchmark.checksum')}: ${result.checksum}`,
      environment ? `${t('cpu-benchmark.browser')}: ${environment.browser}` : '',
      environment ? `${t('cpu-benchmark.operatingSystem')}: ${environment.operatingSystem}` : '',
    ].filter(Boolean)
    copy(lines.join('\n'))
  }, [copy, environment, state.result, t])

  return (
    <ToolLayout toolId="cpu-benchmark" category="Performance" headerExtra={<Badge variant="outline" className="font-mono text-[10px]">{BENCHMARK_VERSION}</Badge>}>
      {(state.phase === 'idle' || state.phase === 'cancelled' || state.phase === 'invalid' || state.phase === 'error') && (
        <SetupPanel
          phase={state.phase}
          invalidReason={state.invalidReason}
          error={state.error}
          selectedDuration={selectedDuration}
          onDurationChange={setSelectedDuration}
          onStart={start}
          t={t}
        />
      )}
      {(state.phase === 'loading' || state.phase === 'validating' || state.phase === 'warming' || state.phase === 'countdown') && (
        <PreparationPanel phase={state.phase} countdown={state.countdown} onStop={stop} t={t} />
      )}
      {state.phase === 'running' && <RunningPanel state={state} onStop={stop} t={t} />}
      {state.phase === 'completed' && state.result && (
        <ResultPanel
          result={state.result}
          environment={environment}
          copied={copiedText !== null}
          onCopy={copyResult}
          onRestart={() => dispatch({ type: 'reset' })}
          t={t}
        />
      )}
      {active && <p className="sr-only" aria-live="polite">{t(`cpu-benchmark.phase.${state.phase}`, { seconds: state.countdown ?? undefined })}</p>}
    </ToolLayout>
  )
}

type Translator = ReturnType<typeof useTranslation>['t']

function SetupPanel({
  phase,
  invalidReason,
  error,
  selectedDuration,
  onDurationChange,
  onStart,
  t,
}: {
  phase: BenchmarkPhase
  invalidReason: 'background' | 'checksum' | null
  error: string | null
  selectedDuration: BenchmarkDurationMs
  onDurationChange: (duration: BenchmarkDurationMs) => void
  onStart: () => void
  t: Translator
}) {
  return (
    <div className="space-y-3">
      {phase !== 'idle' && (
        <div className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${phase === 'cancelled' ? 'bg-muted/40' : 'border-destructive/30 bg-destructive/5 text-destructive'}`} role="status">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">{t(`cpu-benchmark.notice.${phase}.title`)}</p>
            <p className="mt-0.5 text-xs opacity-80">
              {phase === 'invalid'
                ? t(`cpu-benchmark.notice.invalid.${invalidReason ?? 'checksum'}`)
                : phase === 'error' && error === 'unsupported'
                  ? t('cpu-benchmark.notice.error.unsupported')
                  : t(`cpu-benchmark.notice.${phase}.body`)}
            </p>
          </div>
        </div>
      )}

      <div className="rounded-md border p-3 sm:p-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold">{t('cpu-benchmark.durationTitle')}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{t('cpu-benchmark.durationDescription')}</p>
          </div>
          <span className="mt-2 text-xs text-muted-foreground sm:mt-0">{t('cpu-benchmark.localOnly')}</span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {BENCHMARK_DURATIONS.map((duration) => {
            const key = durationKey(duration)
            const selected = selectedDuration === duration
            return (
              <button
                key={duration}
                type="button"
                aria-pressed={selected}
                onClick={() => onDurationChange(duration)}
                className={`min-h-16 rounded-md border p-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected ? 'border-foreground bg-foreground text-background' : 'bg-background hover:bg-muted/60'}`}
              >
                <span className="flex items-center justify-between gap-1 text-sm font-medium">
                  {t(`cpu-benchmark.duration.${key}`)}
                  {duration === 30_000 && <span className={`text-[10px] ${selected ? 'text-background/70' : 'text-muted-foreground'}`}>{t('cpu-benchmark.recommended')}</span>}
                </span>
                <span className={`mt-1 block text-xs leading-snug ${selected ? 'text-background/70' : 'text-muted-foreground'}`}>
                  {t(`cpu-benchmark.durationHint.${key}`)}
                </span>
              </button>
            )
          })}
        </div>

        {selectedDuration === 300_000 && (
          <p className="mt-3 flex items-start gap-2 rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {t('cpu-benchmark.stressWarning')}
          </p>
        )}

        <div className="mt-4 grid gap-3 border-t pt-3 sm:grid-cols-3">
          <Feature icon={Cpu} title={t('cpu-benchmark.singleThread')} body={t('cpu-benchmark.singleThreadHint')} />
          <Feature icon={Zap} title={t('cpu-benchmark.wasm')} body={t('cpu-benchmark.wasmHint')} />
          <Feature icon={ShieldCheck} title={t('cpu-benchmark.private')} body={t('cpu-benchmark.privateHint')} />
        </div>

        <div className="mt-4 flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-xs leading-relaxed text-muted-foreground">{t('cpu-benchmark.preflight')}</p>
          <Button onClick={onStart} className="shrink-0">
            <Activity />
            {t('cpu-benchmark.start')}
          </Button>
        </div>
      </div>

      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {t('cpu-benchmark.disclaimer')}
      </p>
    </div>
  )
}

function Feature({ icon: Icon, title, body }: { icon: typeof Cpu; title: string; body: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="rounded-md bg-muted p-1.5"><Icon className="h-4 w-4 text-foreground/70" /></div>
      <div><p className="text-xs font-medium">{title}</p><p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{body}</p></div>
    </div>
  )
}

function PreparationPanel({ phase, countdown, onStop, t }: { phase: BenchmarkPhase; countdown: number | null; onStop: () => void; t: Translator }) {
  const countdownActive = phase === 'countdown'
  return (
    <div className="rounded-md border px-4 py-8 text-center">
      {countdownActive ? (
        <div className="font-mono text-6xl font-semibold tabular-nums" aria-hidden="true">{countdown}</div>
      ) : (
        <Loader2 className="mx-auto h-6 w-6 animate-spin motion-reduce:animate-none text-muted-foreground" />
      )}
      <h2 className="mt-3 text-sm font-semibold">{t(`cpu-benchmark.phase.${phase}`, { seconds: countdown ?? undefined })}</h2>
      <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">{t(`cpu-benchmark.phaseHint.${phase}`)}</p>
      <Button variant="ghost" size="sm" onClick={onStop} className="mt-4">
        <Square />{t('cpu-benchmark.stop')}
      </Button>
    </div>
  )
}

function RunningPanel({ state, onStop, t }: { state: typeof initialBenchmarkState; onStop: () => void; t: Translator }) {
  const latest = state.samples[state.samples.length - 1] ?? { elapsedMs: 0, completedUnits: 0, checksum: 0 }
  const estimatedScore = calculateEstimatedScore(state.samples)
  const progress = Math.min(100, (latest.elapsedMs / state.durationMs) * 100)
  const remainingSeconds = Math.max(0, Math.ceil((state.durationMs - latest.elapsedMs) / 1000))
  const rateSeries = useMemo(() => createRateSeries(state.samples), [state.samples])

  return (
    <div className="space-y-3">
      <div className="rounded-md border p-3 sm:p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">{t('cpu-benchmark.estimatedScore')}</p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums sm:text-3xl">{estimatedScore.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{t('cpu-benchmark.remaining')}</p>
            <p className="mt-1 font-mono text-lg font-medium tabular-nums">{remainingSeconds}s</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex justify-between text-xs text-muted-foreground">
            <span>{t('cpu-benchmark.timeProgress')}</span><span>{progress.toFixed(0)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={t('cpu-benchmark.timeProgress')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
            <div className="h-full rounded-full bg-foreground transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label={t('cpu-benchmark.completedUnits')} value={latest.completedUnits.toLocaleString()} />
          <Metric label={t('cpu-benchmark.currentRate')} value={`${formatRate(estimatedScore / 1000)} ${t('cpu-benchmark.unitsPerSecond')}`} />
          <Metric label={t('cpu-benchmark.checksum')} value={latest.checksum.toString(16).padStart(8, '0')} mono />
          <Metric label={t('cpu-benchmark.validation')} value={t('cpu-benchmark.passed')} positive />
        </div>

        <div className="mt-4 flex justify-end border-t pt-3">
          <Button variant="outline" size="sm" onClick={onStop}><Square />{t('cpu-benchmark.stop')}</Button>
        </div>
      </div>
      <RateChart data={rateSeries} t={t} />
      <p className="sr-only" aria-live="polite">{t('cpu-benchmark.liveSummary', { seconds: Math.floor(latest.elapsedMs / 1000), units: latest.completedUnits, score: estimatedScore })}</p>
    </div>
  )
}

function ResultPanel({
  result,
  environment,
  copied,
  onCopy,
  onRestart,
  t,
}: {
  result: BenchmarkResult
  environment: BenchmarkEnvironment | null
  copied: boolean
  onCopy: () => void
  onRestart: () => void
  t: Translator
}) {
  const rateSeries = useMemo(() => createRateSeries(result.samples), [result.samples])
  return (
    <div className="space-y-3">
      <div className="rounded-md border p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />{t('cpu-benchmark.resultVerified')}</div>
            <p className="mt-2 text-xs text-muted-foreground">{t('cpu-benchmark.finalScore')}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p className="font-mono text-3xl font-semibold tracking-tight tabular-nums">{result.score.toLocaleString()}</p>
              <Badge variant="secondary" className="text-xs font-medium">{t(`cpu-benchmark.rating.${getBenchmarkRating(result.score)}`)}</Badge>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">{t('cpu-benchmark.rating.scope')}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onCopy}>{copied ? <Check /> : <Copy />}{copied ? t('cpu-benchmark.copied') : t('cpu-benchmark.copyResult')}</Button>
            <Button size="sm" onClick={onRestart}><RotateCcw />{t('cpu-benchmark.testAgain')}</Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-4">
          <MetricCell label={t('cpu-benchmark.averageRate')} value={`${formatRate(result.averageRate)} ${t('cpu-benchmark.unitsPerSecond')}`} />
          <MetricCell label={t('cpu-benchmark.peakRate')} value={`${formatRate(result.peakRate)} ${t('cpu-benchmark.unitsPerSecond')}`} />
          <MetricCell label={t('cpu-benchmark.endingRate')} value={`${formatRate(result.endingRate)} ${t('cpu-benchmark.unitsPerSecond')}`} />
          <MetricCell label={t('cpu-benchmark.sustained')} value={formatPercent(result.sustainedPercent)} />
          <MetricCell label={t('cpu-benchmark.stability')} value={formatPercent(result.stabilityPercent)} />
          <MetricCell label={t('cpu-benchmark.variation')} value={formatPercent(result.variationPercent)} />
          <MetricCell label={t('cpu-benchmark.effectiveTime')} value={`${(result.effectiveMs / 1000).toFixed(2)}s`} />
          <MetricCell label={t('cpu-benchmark.completedUnits')} value={result.completedUnits.toLocaleString()} />
        </div>
      </div>

      <RateChart data={rateSeries} t={t} />

      <div className="rounded-md border p-3 sm:p-4">
        <h2 className="text-sm font-semibold">{t('cpu-benchmark.environmentTitle')}</h2>
        <div className="mt-3 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          <EnvironmentRow label={t('cpu-benchmark.browser')} value={environment?.browser ?? t('cpu-benchmark.unknown')} />
          <EnvironmentRow label={t('cpu-benchmark.operatingSystem')} value={environment?.operatingSystem ?? t('cpu-benchmark.unknown')} />
          <EnvironmentRow label={t('cpu-benchmark.logicalProcessors')} value={environment?.logicalProcessors?.toString() ?? t('cpu-benchmark.unknown')} />
          <EnvironmentRow label={t('cpu-benchmark.simdSupport')} value={environment ? t(environment.wasmSimdSupported ? 'cpu-benchmark.yes' : 'cpu-benchmark.no') : t('cpu-benchmark.unknown')} />
          <EnvironmentRow label={t('cpu-benchmark.crossOriginIsolated')} value={environment ? t(environment.crossOriginIsolated ? 'cpu-benchmark.yes' : 'cpu-benchmark.no') : t('cpu-benchmark.unknown')} />
          <EnvironmentRow label={t('cpu-benchmark.version')} value={result.version} mono />
          <EnvironmentRow label={t('cpu-benchmark.checksum')} value={result.checksum} mono />
        </div>
      </div>

      <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />{t('cpu-benchmark.disclaimer')}</p>
    </div>
  )
}

function Metric({ label, value, mono, positive }: { label: string; value: string; mono?: boolean; positive?: boolean }) {
  return <div><p className="text-xs text-muted-foreground">{label}</p><p className={`mt-1 truncate text-sm font-medium tabular-nums ${mono ? 'font-mono' : ''} ${positive ? 'text-emerald-600 dark:text-emerald-400' : ''}`} title={value}>{value}</p></div>
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return <div className="bg-background p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-mono text-sm font-medium tabular-nums">{value}</p></div>
}

function EnvironmentRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return <div className="flex items-baseline justify-between gap-4 border-b pb-2 text-sm"><span className="text-muted-foreground">{label}</span><span className={`text-right ${mono ? 'font-mono text-xs' : 'font-medium'}`}>{value}</span></div>
}

function RateChart({ data, t }: { data: Array<{ elapsed: number; rate: number }>; t: Translator }) {
  const summary = data.length > 1
    ? t('cpu-benchmark.chartSummary', { start: formatRate(data[0].rate), end: formatRate(data[data.length - 1].rate) })
    : t('cpu-benchmark.chartWaiting')
  return (
    <div className="rounded-md border p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div><h2 className="text-sm font-semibold">{t('cpu-benchmark.chartTitle')}</h2><p className="mt-0.5 text-xs text-muted-foreground">{summary}</p></div>
        <Activity className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="h-40 w-full" role="img" aria-label={summary}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={160} initialDimension={{ width: 320, height: 160 }}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }} accessibilityLayer>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="elapsed" tickFormatter={(value) => `${Math.round(Number(value))}s`} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" minTickGap={28} />
            <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={56} domain={['auto', 'auto']} />
            <Tooltip
              formatter={(value) => [`${formatRate(Number(value))} ${t('cpu-benchmark.unitsPerSecond')}`, t('cpu-benchmark.rate')]}
              labelFormatter={(value) => `${Number(value).toFixed(1)}s`}
              contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--popover-foreground)', fontSize: 12 }}
            />
            <Line type="monotone" dataKey="rate" stroke="var(--foreground)" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
