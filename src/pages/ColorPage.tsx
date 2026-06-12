import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy, Check } from 'lucide-react'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useClipboard } from '@/hooks/useClipboard'
import { hexToRgb, rgbToHex, rgbToHsl, hslToRgb, parseAnyColor } from '@/lib/tools/color'

interface ColorState {
  hex: string
  rgb: string
  hsl: string
}

function rgbToState(r: number, g: number, b: number): ColorState {
  const [h, s, l] = rgbToHsl(r, g, b)
  return {
    hex: rgbToHex(r, g, b),
    rgb: `rgb(${r}, ${g}, ${b})`,
    hsl: `hsl(${h}, ${s}%, ${l}%)`,
  }
}

const DEFAULT_COLOR: ColorState = rgbToState(99, 102, 241)

export function ColorPage() {
  const { t } = useTranslation(['tools', 'common'])
  const [pickerValue, setPickerValue] = useState('#6366f1')
  const [fields, setFields] = useState<ColorState>(DEFAULT_COLOR)
  const { copied, copy } = useClipboard()

  const applyRgb = useCallback((r: number, g: number, b: number) => {
    setFields(rgbToState(r, g, b))
    setPickerValue(rgbToHex(r, g, b))
  }, [])

  function handlePickerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const hex = e.target.value
    setPickerValue(hex)
    try {
      const [r, g, b] = hexToRgb(hex)
      setFields(rgbToState(r, g, b))
    } catch { /* ignore intermediate input */ }
  }

  function handleFieldChange(field: keyof ColorState, value: string) {
    setFields((prev) => ({ ...prev, [field]: value }))
    const rgb = parseAnyColor(value)
    if (rgb) applyRgb(...rgb)
  }

  return (
    <ToolLayout toolId="color" category="Design">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <input
              type="color"
              value={pickerValue}
              onChange={handlePickerChange}
              className="w-12 h-12 rounded-lg border cursor-pointer p-0.5 bg-transparent"
              title={t('color.pickColor', { ns: 'tools' })}
            />
          </div>
          <div
            className="flex-1 h-12 rounded-lg border shadow-sm"
            style={{ backgroundColor: pickerValue }}
          />
          <span className="font-mono text-sm text-muted-foreground select-all">{pickerValue}</span>
        </div>

        <div className="space-y-3">
          <ColorField
            label={t('color.hex', { ns: 'tools' })}
            value={fields.hex}
            onChange={(v) => handleFieldChange('hex', v)}
            copied={copied}
            onCopy={copy}
          />
          <ColorField
            label={t('color.rgb', { ns: 'tools' })}
            value={fields.rgb}
            onChange={(v) => handleFieldChange('rgb', v)}
            copied={copied}
            onCopy={copy}
          />
          <ColorField
            label={t('color.hsl', { ns: 'tools' })}
            value={fields.hsl}
            onChange={(v) => handleFieldChange('hsl', v)}
            copied={copied}
            onCopy={copy}
          />
        </div>
      </div>
    </ToolLayout>
  )
}

function ColorField({
  label,
  value,
  onChange,
  copied,
  onCopy,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  copied: boolean
  onCopy: (text: string) => void
}) {
  const { t } = useTranslation('common')
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono text-sm"
          spellCheck={false}
        />
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 gap-1"
          onClick={() => onCopy(value)}
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? t('ui.copied') : t('ui.copy')}
        </Button>
      </div>
    </div>
  )
}
