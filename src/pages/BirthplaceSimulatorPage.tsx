import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Orbit, RotateCcw, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { ToolError } from '@/components/tools/ToolFeedback'
import { Button } from '@/components/ui/button'
import { useConfettiBurst } from '@/hooks/useConfettiBurst'
import {
  formatBirthCount,
  formatBirthOdds,
  formatBirthProbability,
  pickBirthCountry,
  prepareBirthDistribution,
  type BirthDataset,
  type BirthDistribution,
  type PreparedBirthCountry,
} from '@/lib/tools/birthplace-simulator'

const DATA_URL = '/data/birthplace-simulator.json'
const DRAW_DURATION = 1400
const DRAW_INTERVAL = 90

export function BirthplaceSimulatorPage() {
  const { t, i18n } = useTranslation('tools')
  const [distribution, setDistribution] = useState<BirthDistribution | null>(null)
  const [preview, setPreview] = useState<PreparedBirthCountry | null>(null)
  const [result, setResult] = useState<PreparedBirthCountry | null>(null)
  const [loading, setLoading] = useState(true)
  const [drawing, setDrawing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [flagFailed, setFlagFailed] = useState(false)
  const [drawToken, setDrawToken] = useState(0)
  const timerIds = useRef<number[]>([])
  const sectionRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const burstConfetti = useConfettiBurst(canvasRef, sectionRef)

  const locale = i18n.resolvedLanguage ?? i18n.language ?? 'en'
  const reducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      try {
        const response = await fetch(DATA_URL)
        if (!response.ok) throw new Error('Birth dataset request failed')
        const dataset = await response.json() as BirthDataset
        const nextDistribution = prepareBirthDistribution(dataset)
        if (!cancelled) setDistribution(nextDistribution)
      } catch {
        if (!cancelled) setError(t('birthSimulator.error', { ns: 'tools' }))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadData()
    return () => {
      cancelled = true
      timerIds.current.forEach(clearTimeout)
    }
  }, [t])

  function getCountryName(country: PreparedBirthCountry) {
    try {
      return new Intl.DisplayNames(locale, { type: 'region' }).of(country.code.toUpperCase()) ?? country.name
    } catch {
      return country.name
    }
  }

  function getRegionName(region: string) {
    return t(`birthSimulator.regions.${region}`, { ns: 'tools', defaultValue: region })
  }

  function clearTimers() {
    timerIds.current.forEach(clearTimeout)
    timerIds.current = []
  }

  function startDraw() {
    if (!distribution || drawing) return

    clearTimers()
    setError(null)
    setResult(null)
    setFlagFailed(false)
    setDrawToken((token) => token + 1)
    setDrawing(true)

    const reveal = (celebrate: boolean) => {
      const finalCountry = pickBirthCountry(distribution)
      setPreview(finalCountry)
      setResult(finalCountry)
      setDrawing(false)
      if (celebrate) burstConfetti()
    }

    if (reducedMotion) {
      reveal(false)
      return
    }

    const cycles = Math.ceil(DRAW_DURATION / DRAW_INTERVAL)
    for (let index = 0; index < cycles; index += 1) {
      timerIds.current.push(window.setTimeout(() => {
        setPreview(pickBirthCountry(distribution))
      }, index * DRAW_INTERVAL))
    }
    timerIds.current.push(window.setTimeout(() => reveal(true), DRAW_DURATION))
  }

  const displayedCountry = preview ?? result
  const displayedName = displayedCountry ? getCountryName(displayedCountry) : ''
  const flagSrc = displayedCountry ? `/flags/${displayedCountry.flagCode}.svg` : ''

  return (
    <ToolLayout toolId="birthplace-simulator" category="Fun">
      <section
        ref={sectionRef}
        className="relative overflow-hidden rounded-2xl border border-cyan-300/25 bg-[#0c1a2e] px-5 py-10 text-center text-white shadow-[0_25px_70px_-30px_rgba(34,211,238,0.5),0_12px_40px_-20px_rgba(251,191,36,0.25)] sm:px-10 sm:py-14 dark:bg-[#07111f] dark:shadow-[0_25px_70px_-30px_rgba(34,211,238,0.25),0_12px_40px_-20px_rgba(251,191,36,0.12)]"
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-50">
          <div className="absolute left-[12%] top-[16%] h-1 w-1 rounded-full bg-cyan-200" />
          <div className="absolute right-[18%] top-[28%] h-1.5 w-1.5 rounded-full bg-amber-200" />
          <div className="absolute bottom-[20%] left-[24%] h-1 w-1 rounded-full bg-white" />
          <div className="absolute bottom-[28%] right-[28%] h-1 w-1 rounded-full bg-cyan-200" />
          <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/15" />
          <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/10" />
        </div>

        <div className="relative mx-auto max-w-xl space-y-7">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-cyan-200/30 bg-cyan-300/10 text-cyan-100">
            {drawing ? <Orbit className="h-8 w-8 animate-spin" aria-hidden="true" /> : <Sparkles className="h-8 w-8" aria-hidden="true" />}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-cyan-200/70">{t('birthSimulator.subtitle', { ns: 'tools' })}</p>
            <div className="min-h-28" aria-live="polite">
              {displayedCountry ? (
                <div className="space-y-3">
                  <div className="flex justify-center">
                    {flagFailed ? (
                      <span className="flex h-14 w-20 items-center justify-center rounded-md border border-white/20 bg-white/10 text-sm font-semibold uppercase text-cyan-100">
                        {displayedCountry.code}
                      </span>
                    ) : (
                      <img
                        src={flagSrc}
                        alt={t('birthSimulator.flagAlt', { ns: 'tools', country: displayedName })}
                        className="h-14 w-20 rounded-md object-cover shadow-lg"
                        onError={() => setFlagFailed(true)}
                      />
                    )}
                  </div>
                  <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">{displayedName}</h2>
                  <p className="text-sm text-cyan-100/70">{getRegionName(displayedCountry.region)}</p>
                </div>
              ) : (
                <h2 className="pt-8 text-3xl font-semibold tracking-tight sm:text-4xl">{t('birthSimulator.resultLabel', { ns: 'tools' })}</h2>
              )}
            </div>
          </div>

          <p role="status" className="min-h-4 text-xs text-cyan-100/70">
            {drawing ? t('birthSimulator.loading', { ns: 'tools' }) : ''}
          </p>

          <Button
            size="lg"
            onClick={startDraw}
            disabled={loading || drawing || Boolean(error)}
            className="relative min-w-44 overflow-hidden bg-cyan-300 text-slate-950 hover:bg-cyan-200 disabled:opacity-100"
          >
            {drawing && (
              <span
                key={drawToken}
                aria-hidden="true"
                className="absolute inset-0 origin-left bg-slate-950/20"
                style={{ animation: `birth-sim-progress ${DRAW_DURATION}ms linear forwards` }}
              />
            )}
            <span className="relative flex items-center gap-2">
              {loading || drawing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : result ? (
                <RotateCcw className="h-4 w-4" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {result ? t('birthSimulator.retry', { ns: 'tools' }) : t('birthSimulator.start', { ns: 'tools' })}
            </span>
          </Button>

          <p className="text-xs text-cyan-100/50">{t('birthSimulator.yearLine', { ns: 'tools', year: distribution?.year ?? 2023 })}</p>
        </div>
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20 h-full w-full"
        />
      </section>

      {error && <ToolError message={error} />}

      {result && distribution && (
        <section className="space-y-4 rounded-xl border bg-card p-4 shadow-sm sm:p-6" aria-live="polite">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat label={t('birthSimulator.birthProbability', { ns: 'tools' })} value={formatBirthProbability(result.probability, locale)} />
            <Stat label={t('birthSimulator.birthCount', { ns: 'tools' })} value={formatBirthCount(result.births, locale)} />
            <Stat label={t('birthSimulator.birthRate', { ns: 'tools' })} value={result.birthRate == null ? '—' : `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(result.birthRate)}‰`} />
          </div>
          <p className="text-center text-sm text-muted-foreground">
            {t('birthSimulator.perBirths', { ns: 'tools', count: formatBirthOdds(result.probability, locale) })}
          </p>
          <p className="text-center text-sm italic text-muted-foreground">{t('birthSimulator.tagline', { ns: 'tools' })}</p>

          <details className="rounded-lg border bg-muted/20 px-4 py-3 text-sm">
            <summary className="cursor-pointer font-medium">{t('birthSimulator.details', { ns: 'tools' })}</summary>
            <div className="mt-3 space-y-2 text-muted-foreground">
              <p>{t('birthSimulator.method', { ns: 'tools' })}</p>
              <p>{t('birthSimulator.source', { ns: 'tools' })}</p>
              <p>{t('birthSimulator.disclaimer', { ns: 'tools' })}</p>
            </div>
          </details>
        </section>
      )}
    </ToolLayout>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 px-3 py-3 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  )
}
