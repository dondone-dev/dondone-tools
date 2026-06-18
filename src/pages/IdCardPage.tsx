import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy, Check, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { parseIdCard, type IdCardResult } from '@/lib/tools/id-card'
import { useClipboard } from '@/hooks/useClipboard'

export function IdCardPage() {
  const { t } = useTranslation('tools')
  const { copiedText, copy } = useClipboard()
  const [input, setInput] = useState('')

  const trimmed = input.trim()
  const result = useMemo<IdCardResult | null>(
    () => (trimmed ? parseIdCard(trimmed) : null),
    [trimmed],
  )

  return (
    <ToolLayout toolId="id-card" category="Text">
      <div className="space-y-1.5">
        <Label className="text-xs">{t('id-card.input')}</Label>
        <div className="relative">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('id-card.placeholder')}
            className={cn(
              'font-mono text-sm pr-10 tracking-wide',
              result && !result.valid && 'border-destructive focus-visible:ring-destructive/40',
              result?.valid && 'border-emerald-500 focus-visible:ring-emerald-500/40',
            )}
            autoComplete="off"
            spellCheck={false}
            inputMode="text"
          />
          {result && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              {result.valid ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <XCircle className="h-4 w-4 text-destructive" />
              )}
            </span>
          )}
        </div>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          {t('id-card.privacy')}
        </p>
      </div>

      {result && <StatusBanner result={result} />}

      {result && (result.valid || result.reason === 'checksum') && (
        <div className="space-y-2 border rounded-lg p-4">
          {result.region.full && (
            <ResultRow
              label={t('id-card.region')}
              value={result.region.full}
              copiedText={copiedText}
              onCopy={copy}
              hint={result.region.unknown ? t('id-card.regionUnknown') : undefined}
            />
          )}
          {result.birthDate && (
            <ResultRow label={t('id-card.birthDate')} value={result.birthDate} copiedText={copiedText} onCopy={copy} />
          )}
          {result.age !== null && (
            <PlainRow label={t('id-card.age')} value={t('id-card.ageValue', { age: result.age })} />
          )}
          {result.gender && (
            <PlainRow label={t('id-card.gender')} value={t(`id-card.${result.gender}`)} />
          )}
          {(result.zodiac || result.constellation) && (
            <div className="flex gap-6 pt-1">
              {result.zodiac && <PlainRow label={t('id-card.zodiac')} value={result.zodiac} inline />}
              {result.constellation && <PlainRow label={t('id-card.constellation')} value={result.constellation} inline />}
            </div>
          )}
        </div>
      )}
    </ToolLayout>
  )
}

function StatusBanner({ result }: { result: IdCardResult }) {
  const { t } = useTranslation('tools')
  const ok = result.valid

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg px-4 py-3 text-sm',
        ok ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-destructive/10 text-destructive',
      )}
    >
      <span className="flex items-center gap-2 font-medium">
        {ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
        {ok ? t('id-card.valid') : t('id-card.invalid')}
      </span>
      {ok ? (
        <span className="text-xs opacity-80">
          {t('id-card.formatLabel')}: {t(`id-card.format${result.format}`)}
          {result.checksum && ` · ${t('id-card.checksumOk')}`}
        </span>
      ) : (
        <span className="text-xs">
          {t(`id-card.reason.${result.reason}`, {
            expected: result.checksum?.expected ?? '',
            actual: result.checksum?.actual ?? '',
          })}
        </span>
      )}
    </div>
  )
}

function ResultRow({
  label,
  value,
  hint,
  copiedText,
  onCopy,
}: {
  label: string
  value: string
  hint?: string
  copiedText: string | null
  onCopy: (text: string) => void
}) {
  const { t } = useTranslation('common')
  const isCopied = copiedText === value
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={() => onCopy(value)}>
          {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {isCopied ? t('ui.copied') : t('ui.copy')}
        </Button>
      </div>
      <span className="font-mono text-sm bg-muted/50 rounded px-2 py-1 select-all block">
        {value}
        {hint && <span className="ml-2 font-sans text-xs text-amber-600 dark:text-amber-500">({hint})</span>}
      </span>
    </div>
  )
}

function PlainRow({ label, value, inline }: { label: string; value: string; inline?: boolean }) {
  if (inline) {
    return (
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <span className="text-sm font-medium">{value}</span>
      </div>
    )
  }
  return (
    <div className="flex items-center justify-between py-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}
