import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Copy, History, Loader2, Orbit, RotateCcw, Sparkles, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { ToolError } from '@/components/tools/ToolFeedback'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useClipboard } from '@/hooks/useClipboard'
import { useConfettiBurst } from '@/hooks/useConfettiBurst'
import {
  formatBirthCount,
  formatBirthOdds,
  formatBirthProbability,
  getBirthRarity,
  pickBirthCountry,
  prepareBirthDistribution,
  type BirthDataset,
  type BirthDistribution,
  type PreparedBirthCountry,
} from '@/lib/tools/birthplace-simulator'

const DATA_URL = '/data/birthplace-simulator.json'
const DRAW_DURATION = 1500
const HISTORY_STORAGE_KEY = 'birthplace_simulator_history'
const MAX_HISTORY_ITEMS = 6
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
  const [history, setHistory] = useState<PreparedBirthCountry[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const saved = localStorage.getItem(HISTORY_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as PreparedBirthCountry[]
        if (Array.isArray(parsed)) {
          return parsed.slice(0, MAX_HISTORY_ITEMS)
        }
      }
    } catch {
      /* ignore */
    }
    return []
  })
  const timerIds = useRef<number[]>([])
  const sectionRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const burstConfetti = useConfettiBurst(canvasRef, sectionRef)
  const { copiedText, copy } = useClipboard()
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

  function saveHistory(next: PreparedBirthCountry[]) {
    setHistory(next)
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }

  function clearHistory() {
    setHistory([])
    try {
      localStorage.removeItem(HISTORY_STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }

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
      saveHistory([finalCountry, ...history.filter((item) => item.code !== finalCountry.code)].slice(0, MAX_HISTORY_ITEMS))
      if (celebrate) {
        const rarity = getBirthRarity(finalCountry.probability)
        const particleCount = rarity.tier === 'ultra-rare' ? 80 : rarity.tier === 'rare' ? 60 : 40
        burstConfetti({ particleCount })
      }
    }

    if (reducedMotion) {
      reveal(false)
      return
    }

    // Generate easing timestamps so wheel visibly decelerates
    const stepDelays = [0, 80, 160, 250, 350, 460, 580, 710, 850, 1000, 1160, 1330]
    stepDelays.forEach((delay) => {
      timerIds.current.push(
        window.setTimeout(() => {
          setPreview(pickBirthCountry(distribution))
        }, delay)
      )
    })
    timerIds.current.push(window.setTimeout(() => reveal(true), DRAW_DURATION))
  }

  const displayedCountry = preview ?? result
  const displayedName = displayedCountry ? getCountryName(displayedCountry) : ''
  const flagSrc = displayedCountry ? `/flags/${displayedCountry.flagCode}.svg` : ''
  const displayedRarity = displayedCountry ? getBirthRarity(displayedCountry.probability) : null

  function handleCopyResult() {
    if (!result) return
    const rarity = getBirthRarity(result.probability)
    const rarityText = t(rarity.badgeKey, { ns: 'tools' })
    const probabilityText = formatBirthProbability(result.probability, locale)
    const oddsText = formatBirthOdds(result.probability, locale)
    const text = t('birthSimulator.shareTemplate', {
      ns: 'tools',
      country: getCountryName(result),
      region: getRegionName(result.region),
      rarity: rarityText,
      probability: probabilityText,
      odds: oddsText,
    })
    void copy(text)
  }
  return (
    <ToolLayout toolId="birthplace-simulator" category="Fun">
      <section
        ref={sectionRef}
        className="relative overflow-hidden rounded-2xl border border-sky-200/80 bg-gradient-to-b from-sky-50/70 via-background to-sky-100/30 px-5 py-10 text-center text-foreground shadow-sm sm:px-10 sm:py-14 dark:border-cyan-500/20 dark:bg-gradient-to-b dark:from-[#091526] dark:via-[#0c1a2e] dark:to-[#07111f] dark:text-white dark:shadow-[0_25px_70px_-30px_rgba(34,211,238,0.2),0_12px_40px_-20px_rgba(251,191,36,0.1)]"
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-50">
          <div className="absolute left-[12%] top-[16%] h-1.5 w-1.5 rounded-full bg-sky-400 dark:bg-cyan-200" />
          <div className="absolute right-[18%] top-[28%] h-2 w-2 rounded-full bg-amber-400 dark:bg-amber-200" />
          <div className="absolute bottom-[20%] left-[24%] h-1.5 w-1.5 rounded-full bg-indigo-400 dark:bg-white" />
          <div className="absolute bottom-[28%] right-[28%] h-1.5 w-1.5 rounded-full bg-sky-400 dark:bg-cyan-200" />
          <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-400/15 dark:border-cyan-300/15" />
          <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-400/10 dark:border-cyan-300/10" />
        </div>

        <div className="relative mx-auto max-w-xl space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-sky-300/40 bg-sky-100/60 text-sky-600 dark:border-cyan-200/30 dark:bg-cyan-300/10 dark:text-cyan-200">
            {drawing ? <Orbit className="h-8 w-8 animate-spin" aria-hidden="true" /> : <Sparkles className="h-8 w-8" aria-hidden="true" />}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground dark:text-cyan-200/70">
              {t('birthSimulator.subtitle', { ns: 'tools' })}
            </p>
            <div className="min-h-28" aria-live="polite">
              {displayedCountry ? (
                <div className="space-y-3">
                  <div className="flex justify-center">
                    {flagFailed ? (
                      <span className="flex h-14 w-20 items-center justify-center rounded-md border border-border bg-muted text-sm font-semibold uppercase text-foreground">
                        {displayedCountry.code}
                      </span>
                    ) : (
                      <img
                        src={flagSrc}
                        alt={t('birthSimulator.flagAlt', { ns: 'tools', country: displayedName })}
                        className="h-14 w-20 rounded-md object-cover shadow-md ring-1 ring-black/5 dark:ring-white/10"
                        onError={() => setFlagFailed(true)}
                      />
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">{displayedName}</h2>
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                      <span className="text-sm text-muted-foreground dark:text-cyan-100/70">
                        {getRegionName(displayedCountry.region)}
                      </span>
                      {displayedRarity && (
                        <Badge variant="outline" className={`text-xs font-medium ${displayedRarity.badgeClass}`}>
                          {t(displayedRarity.badgeKey, { ns: 'tools' })}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <h2 className="pt-8 text-2xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  {t('birthSimulator.resultLabel', { ns: 'tools' })}
                </h2>
              )}
            </div>
          </div>

          <p role="status" className="min-h-4 text-xs text-muted-foreground dark:text-cyan-100/70">
            {drawing ? t('birthSimulator.loading', { ns: 'tools' }) : ''}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              onClick={startDraw}
              disabled={loading || drawing || Boolean(error)}
              className="relative min-w-44 overflow-hidden shadow-sm"
            >
              {drawing && (
                <span
                  key={drawToken}
                  aria-hidden="true"
                  className="absolute inset-0 origin-left bg-white/20 dark:bg-slate-950/20"
                  style={{ animation: `birth-sim-progress ${DRAW_DURATION}ms linear forwards` }}
                />
              )}
              <span className="relative flex items-center gap-2 font-medium">
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

            {result && (
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={handleCopyResult}
                className="gap-2"
              >
                {copiedText ? <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-4 w-4" />}
                {copiedText ? t('birthSimulator.shareSuccess', { ns: 'tools' }) : t('birthSimulator.shareResult', { ns: 'tools' })}
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground/80 dark:text-cyan-100/50">
            {t('birthSimulator.yearLine', { ns: 'tools', year: distribution?.year ?? 2023 })}
          </p>
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

          <div className="space-y-1.5 rounded-lg border bg-muted/20 p-3">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t('birthSimulator.birthProbability', { ns: 'tools' })}</span>
              <span className="font-medium text-foreground">{formatBirthProbability(result.probability, locale)}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${Math.max(result.probability * 100, 0.8)}%` }}
              />
            </div>
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

      {history.length > 0 && (
        <section className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <History className="h-4 w-4 text-muted-foreground" />
              <span>{t('birthSimulator.historyTitle', { ns: 'tools' })}</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={clearHistory}
              className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t('birthSimulator.historyClear', { ns: 'tools' })}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {history.map((item, idx) => {
              const rarity = getBirthRarity(item.probability)
              return (
                <div
                  key={`${item.code}-${idx}`}
                  className="inline-flex items-center gap-2 rounded-lg border bg-muted/40 px-2.5 py-1.5 text-xs shadow-2xs"
                >
                  <img
                    src={`/flags/${item.flagCode}.svg`}
                    alt=""
                    className="h-3.5 w-5 rounded-xs object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                  <span className="font-medium text-foreground">{getCountryName(item)}</span>
                  <Badge variant="outline" className={`px-1 py-0 text-[10px] font-normal ${rarity.badgeClass}`}>
                    {t(rarity.badgeKey, { ns: 'tools' })}
                  </Badge>
                </div>
              )
            })}
          </div>
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
