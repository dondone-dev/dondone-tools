import { useTranslation } from 'react-i18next'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { InputFormat, OutputFormat } from '@/lib/tools/img-compress'

interface CompressSettingsPanelProps {
  inputFormat: InputFormat | null
  outputFormat: OutputFormat
  quality: number
  lossless: boolean
  onFormatChange: (fmt: OutputFormat) => void
  onQualityChange: (quality: number) => void
  onLosslessChange: (checked: boolean) => void
}

function showQualitySlider(outputFormat: OutputFormat, lossless: boolean): boolean {
  if (outputFormat === 'jpeg') return true
  if (outputFormat === 'png') return false
  return !lossless
}

function isFormatDisabled(fmt: OutputFormat, lossless: boolean): boolean {
  return lossless && fmt === 'jpeg'
}

export function CompressSettingsPanel({
  inputFormat,
  outputFormat,
  quality,
  lossless,
  onFormatChange,
  onQualityChange,
  onLosslessChange,
}: CompressSettingsPanelProps) {
  const { t } = useTranslation('tools')

  const formats: { id: OutputFormat; label: string; sub: string; tag: 'lossy' | 'lossless' | 'both' }[] = [
    { id: 'jpeg', label: 'JPEG', sub: t('img-compress.codecJpeg'), tag: 'lossy' },
    { id: 'png', label: 'PNG', sub: t('img-compress.codecPng'), tag: 'lossless' },
    { id: 'webp', label: 'WebP', sub: t('img-compress.codecWebp'), tag: lossless ? 'lossless' : 'both' },
  ]

  const tagClass = {
    lossy: 'bg-orange-500/10 text-orange-500',
    lossless: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    both: 'bg-blue-500/10 text-blue-500',
  }
  const tagLabel = {
    lossy: t('img-compress.tagLossy'),
    lossless: t('img-compress.tagLossless'),
    both: t('img-compress.tagBoth'),
  }

  const qualityVisible = inputFormat != null && showQualitySlider(outputFormat, lossless)

  return (
    <>
      {/* Lossless toggle */}
      <div className="border-b px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Label htmlFor="lossless-toggle" className="text-sm font-medium cursor-pointer">
              {t('img-compress.lossless')}
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">{t('img-compress.losslessDesc')}</p>
          </div>
          <Checkbox
            id="lossless-toggle"
            checked={lossless}
            onCheckedChange={(v) => onLosslessChange(v === true)}
          />
        </div>
      </div>

      {/* Format selection */}
      <div className="border-b px-4 py-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {t('img-compress.outputFormat')}
        </p>
        <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label={t('img-compress.outputFormat')}>
          {formats.map((fmt) => {
            const disabled = isFormatDisabled(fmt.id, lossless)
            const selected = outputFormat === fmt.id
            return (
              <button
                key={fmt.id}
                role="radio"
                aria-checked={selected}
                aria-disabled={disabled}
                tabIndex={disabled ? -1 : 0}
                disabled={disabled}
                onClick={() => { if (!disabled) onFormatChange(fmt.id) }}
                className={cn(
                  'relative rounded-lg border px-2.5 py-2 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  selected && !disabled
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-card/60 hover:border-border/80',
                  disabled && 'opacity-35 cursor-not-allowed',
                )}
              >
                <div className="flex flex-wrap items-center gap-1 mb-0.5">
                  <span className={cn(
                    'h-1.5 w-1.5 flex-shrink-0 rounded-full transition-opacity',
                    selected && !disabled ? 'bg-primary opacity-100' : 'opacity-0',
                  )} />
                  <span className="text-xs font-semibold leading-none">{fmt.label}</span>
                  <span className={cn('rounded px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide', tagClass[fmt.tag])}>
                    {tagLabel[fmt.tag]}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground pl-3">{fmt.sub}</p>
                {disabled && (
                  <p className="mt-0.5 text-[9px] text-destructive/70 pl-3 leading-snug">
                    {t('img-compress.jpegNotLossless')}
                  </p>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Quality slider */}
      <div className={cn('border-b px-4 py-3 transition-opacity', !qualityVisible && 'opacity-30 pointer-events-none')}>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs font-medium">{t('img-compress.quality')}</Label>
          <span className="font-mono text-xs font-semibold text-primary tabular-nums">
            {qualityVisible ? quality : '—'}
          </span>
        </div>
        <Slider
          min={1}
          max={100}
          step={1}
          value={[quality]}
          onValueChange={([v]) => onQualityChange(v)}
          disabled={!qualityVisible}
          className="w-full"
        />
        <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
          <span>{t('img-compress.smallerFile')}</span>
          <span>{t('img-compress.betterQuality')}</span>
        </div>
      </div>
    </>
  )
}
