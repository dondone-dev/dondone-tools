import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, CheckCircle2, Info, Search, ShieldCheck } from 'lucide-react'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { checkName, type NameRiskFinding, type NameRiskResult, type Severity } from '@/lib/tools/name-risk'
import { useNameRiskData } from '@/hooks/useNameRiskData'

// ── Category label lookup (i18n key → display) ───────────────────────────────

const CATEGORY_KEYS: Record<string, string> = {
  political_figure: 'name-risk.category.political_figure',
  adult_content_character: 'name-risk.category.adult_content_character',
  negative_public_event: 'name-risk.category.negative_public_event',
  high_frequency_name: 'name-risk.category.high_frequency_name',
  highly_bound_celebrity: 'name-risk.category.highly_bound_celebrity',
  fiction_character: 'name-risk.category.fiction_character',
  game_character: 'name-risk.category.game_character',
  meme_bound_name: 'name-risk.category.meme_bound_name',
  homophone_risk: 'name-risk.category.homophone_risk',
  historical_figure: 'name-risk.category.historical_figure',
  mythology_figure: 'name-risk.category.mythology_figure',
  brand_bound_name: 'name-risk.category.brand_bound_name',
  trendy_name_character: 'name-risk.category.trendy_name_character',
  folk_naming_taboo_character: 'name-risk.category.folk_naming_taboo_character',
  compound_surname_risk: 'name-risk.category.compound_surname_risk',
  generation_association: 'name-risk.category.generation_association',
  rare_character_risk: 'name-risk.category.rare_character_risk',
  reserved: 'name-risk.category.reserved',
}

const MESSAGE_KEYS: Record<string, string> = {
  political_figure: 'name-risk.message.political_figure',
  adult_content_character: 'name-risk.message.adult_content_character',
  negative_public_event: 'name-risk.message.negative_public_event',
  high_frequency_name: 'name-risk.message.high_frequency_name',
  highly_bound_celebrity: 'name-risk.message.highly_bound_celebrity',
  fiction_character: 'name-risk.message.fiction_character',
  game_character: 'name-risk.message.game_character',
  meme_bound_name: 'name-risk.message.meme_bound_name',
  homophone_risk: 'name-risk.message.homophone_risk',
  historical_figure: 'name-risk.message.historical_figure',
  mythology_figure: 'name-risk.message.mythology_figure',
  brand_bound_name: 'name-risk.message.brand_bound_name',
  trendy_name_character: 'name-risk.message.trendy_name_character',
  folk_naming_taboo_character: 'name-risk.message.folk_naming_taboo_character',
  compound_surname_risk: 'name-risk.message.compound_surname_risk',
  generation_association: 'name-risk.message.generation_association',
  rare_character_risk: 'name-risk.message.rare_character_risk',
  reserved: 'name-risk.message.reserved',
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ScanAnimation({ name }: { name: string }) {
  const { t } = useTranslation('tools')
  const lineRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = lineRef.current
    if (!el) return
    el.style.animation = 'none'
    void el.offsetWidth
    el.style.animation = ''
  }, [name])

  return (
    <div className="flex flex-col items-start gap-6">
      <div className="relative inline-block">
        <p
          className="text-5xl font-light tracking-[0.25em] text-foreground select-none"
          aria-hidden="true"
        >
          {name}
        </p>
        <div
          ref={lineRef}
          className="absolute top-0 left-0 h-full w-0.5 name-scan-line"
          aria-hidden="true"
        />
      </div>
      <p className="text-xs font-mono text-muted-foreground tracking-wide animate-pulse">
        {t('name-risk.loadingData')}
      </p>
    </div>
  )
}

function VerdictBanner({ result }: { result: NameRiskResult }) {
  const { t } = useTranslation('tools')
  const count = result.findings.length
  const sev = result.worstSeverity

  if (!sev) {
    return (
      <div className="flex items-center gap-2.5 rounded-lg px-4 py-3 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-sm font-medium">
        <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
        {t('name-risk.verdict.clean')}
        <span className="ml-auto font-mono text-[11px] opacity-60 font-normal">
          {t('name-risk.verdict.countZero')}
        </span>
      </div>
    )
  }

  const classes: Record<Severity, string> = {
    red: 'bg-destructive/10 text-destructive',
    yellow: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    info: 'bg-muted text-muted-foreground',
  }

  const Icon = sev === 'red' ? AlertTriangle : sev === 'yellow' ? AlertTriangle : Info

  return (
    <div className={cn('flex items-center gap-2.5 rounded-lg px-4 py-3 text-sm font-medium', classes[sev])}>
      <Icon className="h-4 w-4 flex-shrink-0" />
      {t(`name-risk.verdict.${sev}`)}
      <span className="ml-auto font-mono text-[11px] opacity-60 font-normal">
        {t('name-risk.verdict.count', { count })}
      </span>
    </div>
  )
}

function FindingRow({ finding }: { finding: NameRiskFinding }) {
  const { t } = useTranslation('tools')

  const barClass: Record<Severity, string> = {
    red: 'bg-destructive',
    yellow: 'bg-amber-500',
    info: 'bg-muted-foreground/40',
  }

  const badgeClass: Record<Severity, string> = {
    red: 'bg-destructive/10 text-destructive border-0',
    yellow: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-0',
    info: 'bg-muted text-muted-foreground border-0',
  }

  const badgeLabel = t(`name-risk.severity.${finding.severity}`)
  const categoryKey = CATEGORY_KEYS[finding.category] ?? 'name-risk.category.reserved'
  const messageKey = MESSAGE_KEYS[finding.category] ?? 'name-risk.message.reserved'

  return (
    <div className="flex items-stretch rounded-md border overflow-hidden bg-card">
      <div className={cn('w-0.5 flex-shrink-0', barClass[finding.severity])} aria-hidden="true" />
      <div className="flex-1 p-3 flex flex-col gap-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('text-[10px] font-mono font-medium px-1.5 py-0.5 rounded uppercase tracking-wide', badgeClass[finding.severity])}>
            {badgeLabel}
          </span>
          <span className="text-xs text-muted-foreground font-medium">{t(categoryKey)}</span>
          {finding.matchedChars && finding.matchedChars.length > 0 && (
            <div className="ml-auto flex gap-1" aria-label={t('name-risk.matchedChars')}>
              {finding.matchedChars.map((ch) => (
                <Badge
                  key={ch}
                  variant="secondary"
                  className="text-sm px-1.5 py-0 h-5 font-normal tracking-wide"
                >
                  {ch}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{t(messageKey)}</p>
      </div>
    </div>
  )
}

function CleanResult({ name }: { name: string }) {
  const { t } = useTranslation('tools')
  return (
    <div className="flex flex-col gap-4">
      <div className="text-5xl font-light tracking-[0.25em] text-foreground">{name}</div>
      <div className="flex items-center gap-2.5 rounded-lg px-4 py-3 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-sm font-medium">
        <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
        {t('name-risk.verdict.clean')}
        <span className="ml-auto font-mono text-[11px] opacity-60 font-normal">0</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{t('name-risk.cleanDetail')}</p>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function NameRiskPage() {
  const { t } = useTranslation('tools')
  const { data, status, error } = useNameRiskData()

  const [input, setInput] = useState('')
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<NameRiskResult | null>(null)
  const [pendingName, setPendingName] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const trimmed = input.trim()

  async function runCheck(name: string) {
    if (!data || !name) return
    setResult(null)
    setPendingName(name)
    setScanning(true)
    // Minimum 600ms scan display so the animation has time to run
    const [res] = await Promise.all([
      checkName(name, data),
      new Promise<void>((r) => setTimeout(r, 650)),
    ])
    setScanning(false)
    setPendingName(null)
    setResult(res)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!trimmed || status !== 'ready') return
    runCheck(trimmed)
  }

  // Sort findings: red → yellow → info, dedup by category within hash/rule groups
  const sortedFindings = result
    ? [...result.findings].sort((a, b) => {
        const rank: Record<Severity, number> = { red: 0, yellow: 1, info: 2 }
        return rank[a.severity] - rank[b.severity]
      })
    : []

  const isIdle = !scanning && !result
  const isLoading = status === 'loading'
  const isError = status === 'error'

  return (
    <ToolLayout toolId="name-risk" category="Text">
      <style>{`
        @keyframes nameScan {
          0%   { left: 0; opacity: 1; }
          80%  { left: calc(100% - 2px); opacity: 1; }
          100% { left: calc(100% - 2px); opacity: 0; }
        }
        @media (prefers-reduced-motion: no-preference) {
          .name-scan-line {
            animation: nameScan 0.6s ease-in-out forwards;
            background: linear-gradient(to bottom, transparent, hsl(var(--primary)), transparent);
            box-shadow: 0 0 8px 2px hsl(var(--primary) / 0.3);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .name-scan-line { display: none; }
        }
      `}</style>

      <form onSubmit={handleSubmit} className="space-y-1.5">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('name-risk.placeholder')}
            className="text-lg tracking-widest font-light"
            maxLength={10}
            autoComplete="off"
            spellCheck={false}
            aria-label={t('name-risk.inputLabel')}
            disabled={isLoading}
          />
          <Button
            type="submit"
            disabled={!trimmed || status !== 'ready' || scanning}
            className="px-5 gap-1.5"
            aria-label={t('name-risk.screenButton')}
          >
            <Search className="h-4 w-4" />
            {t('name-risk.screenButton')}
          </Button>
        </div>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          {t('name-risk.privacy')}
        </p>
      </form>

      {isLoading && (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin" aria-hidden="true" />
          {t('name-risk.loadingData')}
        </div>
      )}

      {isError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            {t('name-risk.loadError')}
          </div>
          {error && (
            <p className="mt-1 pl-6 text-xs opacity-80">{error}</p>
          )}
        </div>
      )}

      {isIdle && !isLoading && !isError && (
        <p className="py-4 text-sm text-muted-foreground">{t('name-risk.idle')}</p>
      )}

      {scanning && pendingName && (
        <ScanAnimation name={pendingName} />
      )}

      {result && !scanning && (
        <div className="space-y-3">
          {result.worstSeverity === null ? (
            <CleanResult name={result.name} />
          ) : (
            <>
              <div className="text-5xl font-light tracking-[0.25em] text-foreground">
                {result.name}
              </div>
              <VerdictBanner result={result} />
              <div className="space-y-1.5 pt-1">
                {sortedFindings.map((f, i) => (
                  <FindingRow key={`${f.category}-${f.matchType}-${i}`} finding={f} />
                ))}
              </div>
            </>
          )}

          <p className="text-[11px] text-muted-foreground/60 leading-relaxed pt-2 border-t">
            {t('name-risk.disclaimer')}
          </p>
        </div>
      )}

      {data && (
        <p className="text-[11px] font-mono text-muted-foreground/40 pt-2">
          {t('name-risk.dataVersion', {
            date: data.meta.generatedAt.slice(0, 10),
            count: data.meta.entryCount,
          })}
        </p>
      )}
    </ToolLayout>
  )
}
