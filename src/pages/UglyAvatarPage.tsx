import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { RefreshCw, Download } from 'lucide-react'
import { generateAvatar, BACKGROUND_PRESETS } from '@/lib/tools/ugly-avatar'

type Background = 'auto' | string

export function UglyAvatarPage() {
  const { t } = useTranslation('tools')
  const [background, setBackground] = useState<Background>('auto')
  const [avatar, setAvatar] = useState(() => generateAvatar({ size: 256, background: 'auto' }))

  const handleGenerate = useCallback(() => {
    setAvatar(generateAvatar({ size: 256, background }))
  }, [background])

  const handleDownload = () => {
    const blob = new Blob([avatar.svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'ugly-avatar.svg'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <ToolLayout toolId="ugly-avatar" category="Fun">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground shrink-0">{t('ugly-avatar.background')}</Label>
            <Select value={background} onValueChange={setBackground}>
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto</SelectItem>
                {Object.entries(BACKGROUND_PRESETS).map(([key, color]) => (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full inline-block" style={{ background: color }} />
                      {key}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleGenerate} size="sm" variant="outline" className="gap-1.5 text-xs">
            <RefreshCw className="h-3.5 w-3.5" />{t('ugly-avatar.regenerate')}
          </Button>
        </div>

        <div className="flex items-start gap-4">
          <div
            className="border border-border rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
            onClick={handleGenerate}
            title={t('ugly-avatar.clickToRegenerate')}
          >
            <div dangerouslySetInnerHTML={{ __html: avatar.svg }} />
          </div>
          <div className="space-y-2 pt-1">
            <Button onClick={handleDownload} size="sm" variant="outline" className="gap-1.5 text-xs">
              <Download className="h-3.5 w-3.5" />{t('ugly-avatar.downloadSvg')}
            </Button>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>Face: {avatar.state.faceGeometry.kind}</p>
              <p>Hair: {avatar.state.hairMode}</p>
              <p>Accessory: {avatar.state.accessory}</p>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  )
}
