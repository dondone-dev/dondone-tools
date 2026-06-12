import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { generateUuids, toCSV } from '@/lib/tools/uuid'

export function UuidPage() {
  const { t } = useTranslation('tools')
  const [count, setCount] = useState(1)
  const [uuids, setUuids] = useState<string[]>([])
  const [copied, setCopied] = useState(false)

  function handleGenerate() {
    setUuids(generateUuids(count))
    setCopied(false)
  }

  function handleCopyAll() {
    if (uuids.length === 0) return
    navigator.clipboard.writeText(uuids.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDownloadCSV() {
    if (uuids.length === 0) return
    const blob = new Blob([toCSV(uuids)], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'uuids.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const countValue = isNaN(count) ? 1 : Math.max(1, Math.min(count, 1000))

  return (
    <ToolLayout toolId="uuid" category="Fun">
      <div className="space-y-4">
        <div className="flex items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="uuid-count">{t('uuid.count')} <span className="text-muted-foreground text-xs">(1 – 1000)</span></Label>
            <Input
              id="uuid-count"
              type="number"
              min={1}
              max={1000}
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value, 10))}
              className="w-28"
            />
          </div>
          <Button onClick={handleGenerate}>{t('uuid.generate')}</Button>
        </div>

        {uuids.length > 0 && (
          <>
            <Textarea
              readOnly
              rows={10}
              value={uuids.join('\n')}
              className="font-mono text-sm resize-y"
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {countValue} {t('uuid.generated')}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopyAll}>
                  {copied ? t('uuid.copied') : t('uuid.copyAll')}
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownloadCSV}>
                  {t('uuid.downloadCSV')}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </ToolLayout>
  )
}
