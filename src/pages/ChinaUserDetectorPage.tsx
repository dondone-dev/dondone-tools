import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Copy, Loader2, Radar, Wifi } from 'lucide-react'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useClipboard } from '@/hooks/useClipboard'
import {
  detectEmojiSignal,
  detectFontSignal,
  evaluateAggregate,
  evaluateLanguageSignal,
  evaluateTimeZoneSignal,
  evaluateUtcOffsetSignal,
  readBrowserEnvironment,
  runNetworkProbe,
  type ChinaDetectorMode,
  type ChinaDetectorResult,
  type ChinaDetectorStatus,
  type NetworkProbeResult,
  type SignalResult,
} from '@/lib/tools/china-user-detector'

const STATUS_VARIANT: Record<ChinaDetectorStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  match: 'default',
  miss: 'secondary',
  unknown: 'outline',
  unavailable: 'outline',
  error: 'destructive',
}

export function ChinaUserDetectorPage() {
  const { t } = useTranslation(['tools', 'common'])
  const { copiedText, copy } = useClipboard()

  const [mode, setMode] = useState<ChinaDetectorMode>('greater-china')
  const [strict, setStrict] = useState(false)
  const [networkSignal, setNetworkSignal] = useState<NetworkProbeResult | null>(null)
  const [networkLoading, setNetworkLoading] = useState(false)
  const [localSignals, setLocalSignals] = useState<SignalResult[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const emoji = detectEmojiSignal()
    const font = detectFontSignal()
    setLocalSignals([emoji, font])
  }, [])

  const options = useMemo(() => ({ mode, strict }), [mode, strict])

  const result: ChinaDetectorResult | null = useMemo(() => {
    if (!mounted) return null
    const env = readBrowserEnvironment()
    const langSignal = evaluateLanguageSignal(env.languages, options)
    const tzSignal = evaluateTimeZoneSignal(env.timeZone, options)
    const offsetSignal = evaluateUtcOffsetSignal(env.utcOffsetMinutes, options)

    const signals: SignalResult[] = [
      langSignal,
      tzSignal,
      offsetSignal,
      ...localSignals,
      ...(networkSignal ? [networkSignal as SignalResult] : []),
    ]

    return evaluateAggregate(signals, options)
  }, [mounted, options, localSignals, networkSignal])

  const handleRunNetwork = useCallback(async () => {
    setNetworkLoading(true)
    try {
      const probe = await runNetworkProbe()
      setNetworkSignal(probe)
    } finally {
      setNetworkLoading(false)
    }
  }, [])

  const jsonOutput = useMemo(() => {
    if (!result) return ''
    return JSON.stringify(result, null, 2)
  }, [result])

  const isCopied = copiedText === jsonOutput && jsonOutput.length > 0

  const confidenceColor = (c: string) => {
    switch (c) {
      case 'high': return 'text-green-600 dark:text-green-400'
      case 'medium': return 'text-amber-600 dark:text-amber-400'
      case 'low': return 'text-muted-foreground'
      default: return 'text-muted-foreground'
    }
  }

  return (
    <ToolLayout toolId="china-user-detector" category="Security">
      {/* Summary */}
      {result && (
        <section className="border rounded-md p-4 bg-muted/20 space-y-2">
          <div className="flex items-center gap-2">
            <Radar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {t(`china-user-detector.result.${result.resultKey}`, { ns: 'tools' })}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span>
              {t('china-user-detector.score', { ns: 'tools' })}: <span className="font-mono font-medium">{result.score} / {result.maxScore}</span>
            </span>
            <span>
              {t('china-user-detector.confidence.label', { ns: 'tools' })}: <span className={`font-medium ${confidenceColor(result.confidence)}`}>{t(`china-user-detector.confidence.${result.confidence}`, { ns: 'tools' })}</span>
            </span>
          </div>
        </section>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={mode} onValueChange={v => setMode(v as ChinaDetectorMode)}>
          <TabsList className="h-8">
            <TabsTrigger value="greater-china" className="text-xs h-7 px-3">
              {t('china-user-detector.greaterChina', { ns: 'tools' })}
            </TabsTrigger>
            <TabsTrigger value="mainland" className="text-xs h-7 px-3">
              {t('china-user-detector.mainland', { ns: 'tools' })}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-1.5">
          <Checkbox
            id="strict-mode"
            checked={strict}
            onCheckedChange={v => setStrict(v === true)}
          />
          <Label htmlFor="strict-mode" className="text-xs cursor-pointer">
            {t('china-user-detector.strict', { ns: 'tools' })}
          </Label>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={handleRunNetwork}
          disabled={networkLoading}
          aria-busy={networkLoading}
        >
          {networkLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wifi className="h-3 w-3" />}
          {networkLoading
            ? t('china-user-detector.runningNetwork', { ns: 'tools' })
            : t('china-user-detector.runNetwork', { ns: 'tools' })}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={() => copy(jsonOutput)}
          disabled={!jsonOutput}
        >
          {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {isCopied ? t('ui.copied', { ns: 'common' }) : t('china-user-detector.copyJson', { ns: 'tools' })}
        </Button>
      </div>

      {/* Signal Details */}
      {result && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium">
            {t('china-user-detector.signals', { ns: 'tools' })}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {result.signals.map(signal => (
              <div
                key={signal.id}
                className="border rounded-md p-3 flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">
                    {t(`china-user-detector.signalNames.${signal.id}`, { ns: 'tools' })}
                  </span>
                  <Badge variant={STATUS_VARIANT[signal.status]} className="text-[10px] px-1.5 py-0">
                    {t(`china-user-detector.status.${signal.status}`, { ns: 'tools' })}
                  </Badge>
                </div>
                <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                  <span className="truncate max-w-[70%]">
                    {signal.observed.length > 0 ? signal.observed.join(', ') : '-'}
                  </span>
                  <span className="font-mono">
                    {signal.score}/{signal.maxScore}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Network notice */}
      {!networkSignal && (
        <p className="text-xs text-muted-foreground">
          {t('china-user-detector.networkNotice', { ns: 'tools' })}
        </p>
      )}

      {/* Network probe details */}
      {networkSignal && networkSignal.details.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium">
            {t('china-user-detector.networkDetails', { ns: 'tools' })}
          </h2>
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/20">
                  <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">URL</th>
                  <th className="text-right px-3 py-1.5 font-medium text-muted-foreground">
                    {t('china-user-detector.status.label', { ns: 'tools' })}
                  </th>
                  <th className="text-right px-3 py-1.5 font-medium text-muted-foreground">ms</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {networkSignal.details.map(d => (
                  <tr key={d.url} className="hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-1.5 font-mono truncate max-w-[200px]">{d.url.replace(/https?:\/\//, '')}</td>
                    <td className="px-3 py-1.5 text-right">
                      <Badge variant={d.reachable ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                        {d.reachable ? t('china-user-detector.reachable', { ns: 'tools' }) : t('china-user-detector.unreachable', { ns: 'tools' })}
                      </Badge>
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-muted-foreground">{d.elapsed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </ToolLayout>
  )
}
