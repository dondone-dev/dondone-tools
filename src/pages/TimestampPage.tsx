import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { fromUnix, toUnix, isMilliseconds } from '@/lib/tools/timestamp'
import { useClipboard } from '@/hooks/useClipboard'
import { ToolError, ToolResultField } from '@/components/tools/ToolFeedback'

export function TimestampPage() {
  const { t } = useTranslation('tools')
  const { copiedText, copy } = useClipboard()
  const [now, setNow] = useState(() => Date.now())
  const [unixInput, setUnixInput] = useState('')
  const [unixResult, setUnixResult] = useState<ReturnType<typeof fromUnix> | null>(null)
  const [unixError, setUnixError] = useState('')
  const [humanInput, setHumanInput] = useState('')
  const [humanResult, setHumanResult] = useState<{ seconds: number; milliseconds: number } | null>(null)
  const [humanError, setHumanError] = useState('')

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  function handleFromUnix() {
    setUnixError('')
    setUnixResult(null)
    try {
      const ts = Number(unixInput.trim())
      if (!unixInput.trim() || isNaN(ts)) throw new Error('Invalid number')
      setUnixResult(fromUnix(ts))
    } catch (e) {
      setUnixError((e as Error).message)
    }
  }

  function handleToUnix() {
    setHumanError('')
    setHumanResult(null)
    try {
      setHumanResult(toUnix(humanInput))
    } catch (e) {
      setHumanError((e as Error).message)
    }
  }

  return (
    <ToolLayout toolId="timestamp" category="Text">
      <div className="text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2 font-mono">
        {t('timestamp.current')}: <span className="text-foreground font-semibold">{Math.floor(now / 1000)}</span>
        <span className="text-xs ml-2 opacity-60">({now} ms)</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3 border rounded-lg p-4">
          <h3 className="text-sm font-medium">{t('timestamp.unixToHuman')}</h3>
          <div className="flex gap-2">
            <Input
              value={unixInput}
              onChange={(e) => setUnixInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFromUnix()}
              placeholder={t('timestamp.placeholder')}
              className="font-mono text-sm"
            />
            <Button size="sm" onClick={handleFromUnix}>{t('timestamp.convert')}</Button>
          </div>
          {unixError && (
            <ToolError message={unixError} />
          )}
          {unixResult && (
            <div className="space-y-2 text-sm">
              <ResultRow label={t('timestamp.iso')} value={unixResult.iso} copiedText={copiedText} onCopy={copy} />
              <ResultRow label={t('timestamp.local')} value={unixResult.local} copiedText={copiedText} onCopy={copy} />
              <ResultRow label={t('timestamp.utc')} value={unixResult.utc} copiedText={copiedText} onCopy={copy} />
              <ResultRow label={t('timestamp.relative')} value={unixResult.relative} copiedText={copiedText} onCopy={copy} />
              <p className="text-xs text-muted-foreground">
                {isMilliseconds(Number(unixInput)) ? 'ms' : 's'}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-3 border rounded-lg p-4">
          <h3 className="text-sm font-medium">{t('timestamp.humanToUnix')}</h3>
          <div className="flex gap-2">
            <Input
              value={humanInput}
              onChange={(e) => setHumanInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleToUnix()}
              placeholder="2024-01-01T00:00:00Z"
              className="font-mono text-sm"
            />
            <Button size="sm" onClick={handleToUnix}>{t('timestamp.convert')}</Button>
          </div>
          {humanError && (
            <ToolError message={humanError} />
          )}
          {humanResult && (
            <div className="space-y-2 text-sm">
              <ResultRow label={t('timestamp.seconds')} value={String(humanResult.seconds)} copiedText={copiedText} onCopy={copy} />
              <ResultRow label={t('timestamp.milliseconds')} value={String(humanResult.milliseconds)} copiedText={copiedText} onCopy={copy} />
            </div>
          )}
        </div>
      </div>
    </ToolLayout>
  )
}

function ResultRow({ label, value, copiedText, onCopy }: { label: string; value: string; copiedText: string | null; onCopy: (text: string) => void }) {
  return <ToolResultField label={label} value={value} copiedText={copiedText} onCopy={onCopy} />
}
