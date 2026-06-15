import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Copy, ExternalLink, Upload } from 'lucide-react'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useClipboard } from '@/hooks/useClipboard'
import { parseExif, type ParsedExif } from '@/lib/tools/exif'
import { cn } from '@/lib/utils'

type SectionId = 'camera' | 'exposure' | 'datetime' | 'gps' | 'image'

export function ExifPage() {
  const { t } = useTranslation(['tools', 'common'])
  const inputRef = useRef<HTMLInputElement>(null)
  const objectUrlRef = useRef('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [result, setResult] = useState<ParsedExif | null>(null)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const { copiedText, copy } = useClipboard()

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [])

  async function handleFile(file: File) {
    setError('')
    setResult(null)

    if (!file.type.startsWith('image/')) {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = ''
      }
      setPreviewUrl('')
      setError(t('exif.imageOnly', { ns: 'tools' }))
      return
    }

    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    const url = URL.createObjectURL(file)
    objectUrlRef.current = url
    setPreviewUrl(url)

    try {
      const parsed = await parseExif(file)
      if (!parsed) {
        setError(t('exif.noExif', { ns: 'tools' }))
      } else {
        setResult(parsed)
      }
    } catch {
      setError(t('exif.loadFailed', { ns: 'tools' }))
    }
  }

  function handleFiles(files: FileList | null) {
    const file = files?.[0]
    if (file) handleFile(file)
  }

  const sectionTitles: Record<SectionId, string> = {
    camera: t('exif.sections.camera', { ns: 'tools' }),
    exposure: t('exif.sections.exposure', { ns: 'tools' }),
    datetime: t('exif.sections.datetime', { ns: 'tools' }),
    gps: t('exif.sections.gps', { ns: 'tools' }),
    image: t('exif.sections.image', { ns: 'tools' }),
  }

  const mapsUrl = result?.gps
    ? `https://www.google.com/maps?q=${result.gps.lat},${result.gps.lon}`
    : undefined

  return (
    <ToolLayout toolId="exif" category="Image">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div
        role="button"
        tabIndex={0}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
          dragOver ? 'border-foreground/50 bg-muted/50' : 'border-border hover:border-foreground/30 focus-visible:border-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
        )}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click() } }}
      >
        <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t('exif.dropImage', { ns: 'tools' })}</p>
      </div>

      {previewUrl && (
        <div className="flex items-start gap-4">
          <img
            src={previewUrl}
            alt=""
            className="w-24 h-24 rounded-md border border-border object-cover flex-shrink-0 bg-muted/30"
          />
          {result && (
            <div className="text-xs text-muted-foreground space-y-1 pt-1">
              {result.sections.find(s => s.id === 'camera')?.fields.slice(0, 2).map(f => (
                <p key={f.labelKey}>{f.value}</p>
              ))}
              {result.gps && mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-foreground/70 hover:text-foreground transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-3 w-3" />
                  {t('exif.openMap', { ns: 'tools' })}
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
      )}

      {result && result.sections.length > 0 && (
        <div className="space-y-3">
          {result.sections.map((section) => (
            <section key={section.id} className="border rounded-md overflow-hidden">
              <div className="px-3 py-2 bg-muted/40 border-b">
                <span className="text-xs font-medium">{sectionTitles[section.id]}</span>
              </div>
              <div className="divide-y">
                {section.fields.map((field) => {
                  const isCopied = copiedText === field.value
                  return (
                    <div key={field.labelKey} className="flex items-center justify-between px-3 py-1.5 gap-3 group">
                      <Label className="text-xs text-muted-foreground shrink-0 w-32">
                        {t(`exif.fields.${field.labelKey}`, { ns: 'tools' })}
                      </Label>
                      <span className="text-xs font-mono flex-1 truncate" title={field.value}>
                        {field.value}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                        onClick={() => copy(field.value)}
                        aria-label={isCopied ? t('ui.copied', { ns: 'common' }) : t('ui.copy', { ns: 'common' })}
                      >
                        {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </ToolLayout>
  )
}
