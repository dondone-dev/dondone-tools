import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ToolError, ToolResultField, ToolStatus } from '@/components/tools/ToolFeedback'
import { useClipboard } from '@/hooks/useClipboard'
import { formatCoordinate, parseCoordinatePair, type CoordinateFormat } from '@/lib/tools/coordinate-format'
import { convertDatum, isOutOfChina, type Datum } from '@/lib/tools/coordinate-datum'

const DATUMS: Datum[] = ['WGS84', 'GCJ02', 'BD09']
const FORMATS: CoordinateFormat[] = ['decimal', 'dms', 'ddm']

export function CoordinatesPage() {
  const { t } = useTranslation('tools')
  const { copiedText, copy } = useClipboard()
  const [input, setInput] = useState('')
  const [fromDatum, setFromDatum] = useState<Datum>('WGS84')
  const [toDatum, setToDatum] = useState<Datum>('GCJ02')
  const [outputFormat, setOutputFormat] = useState<CoordinateFormat>('decimal')

  const trimmed = input.trim()
  const parsed = useMemo(() => {
    if (!trimmed) return null
    try {
      return { value: parseCoordinatePair(trimmed), error: null }
    } catch (e) {
      return { value: null, error: (e as Error).message }
    }
  }, [trimmed])

  const conversion = useMemo(() => {
    if (!parsed?.value) return null
    const source = { lng: parsed.value.lng, lat: parsed.value.lat }
    const target = convertDatum(source, fromDatum, toDatum)
    return {
      lat: formatCoordinate(target.lat, 'lat', outputFormat),
      lng: formatCoordinate(target.lng, 'lng', outputFormat),
      outOfChina: fromDatum !== toDatum && isOutOfChina(source),
    }
  }, [parsed, fromDatum, toDatum, outputFormat])

  return (
    <ToolLayout toolId="coordinates" category="Text">
      <div className="space-y-1.5">
        <Label className="text-xs">{t('coordinates.input')}</Label>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('coordinates.placeholder')}
          className="font-mono text-sm"
          autoComplete="off"
          spellCheck={false}
        />
        <p className="text-xs text-muted-foreground">{t('coordinates.inputHint')}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <DatumField label={t('coordinates.fromDatum')} value={fromDatum} onChange={setFromDatum} t={t} />
        <DatumField label={t('coordinates.toDatum')} value={toDatum} onChange={setToDatum} t={t} />
        <div className="space-y-1.5">
          <Label className="text-xs">{t('coordinates.outputFormat')}</Label>
          <Select value={outputFormat} onValueChange={(v) => setOutputFormat(v as CoordinateFormat)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FORMATS.map((format) => (
                <SelectItem key={format} value={format}>
                  {t(`coordinates.format.${format}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {parsed?.error && <ToolError message={parsed.error} />}

      {conversion && (
        <div className="space-y-3">
          {conversion.outOfChina && <ToolStatus message={t('coordinates.outOfChinaNotice')} />}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ToolResultField label={t('coordinates.lat')} value={conversion.lat} copiedText={copiedText} onCopy={copy} />
            <ToolResultField label={t('coordinates.lng')} value={conversion.lng} copiedText={copiedText} onCopy={copy} />
          </div>
          <ToolResultField
            label={t('coordinates.combined')}
            value={`${conversion.lat} ${conversion.lng}`}
            copiedText={copiedText}
            onCopy={copy}
          />
        </div>
      )}
    </ToolLayout>
  )
}

function DatumField({
  label,
  value,
  onChange,
  t,
}: {
  label: string
  value: Datum
  onChange: (value: Datum) => void
  t: (key: string) => string
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={(v) => onChange(v as Datum)}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DATUMS.map((datum) => (
            <SelectItem key={datum} value={datum}>
              {t(`coordinates.datum.${datum}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
