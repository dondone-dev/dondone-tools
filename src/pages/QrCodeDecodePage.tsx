import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Copy, ExternalLink, Upload } from 'lucide-react'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useClipboard } from '@/hooks/useClipboard'
import { classifyQrCodeText, decodeImageData, type QrCodePayloadType } from '@/lib/tools/qrcode'
import { cn } from '@/lib/utils'

interface DecodeResult {
  text: string
  type: QrCodePayloadType
}

export function QrCodeDecodePage() {
  const { t } = useTranslation(['tools', 'common'])
  const inputRef = useRef<HTMLInputElement>(null)
  const objectUrlRef = useRef('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [result, setResult] = useState<DecodeResult | null>(null)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const { copiedText, copy } = useClipboard()

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [])

  function resetObjectUrl(url: string) {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    objectUrlRef.current = url
    setPreviewUrl(url)
  }

  function decodeFile(file: File) {
    setError('')
    setResult(null)

    if (!file.type.startsWith('image/')) {
      setError(t('qrcode-decode.imageOnly'))
      return
    }

    const url = URL.createObjectURL(file)
    resetObjectUrl(url)

    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth || img.width
      canvas.height = img.naturalHeight || img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        setError(t('qrcode-decode.canvasUnavailable'))
        return
      }

      ctx.drawImage(img, 0, 0)
      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const decoded = decodeImageData({ data: imageData.data, width: canvas.width, height: canvas.height })
        setResult({ text: decoded.text, type: classifyQrCodeText(decoded.text) })
      } catch (e) {
        setError((e as Error).message)
      }
    }
    img.onerror = () => setError(t('qrcode-decode.loadFailed'))
    img.src = url
  }

  function handleFiles(files: FileList | null) {
    const file = files?.[0]
    if (file) decodeFile(file)
  }

  return (
    <ToolLayout toolId="qrcode-decode" category="Encoding">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
          dragOver ? 'border-foreground/50 bg-muted/50' : 'border-border hover:border-foreground/30'
        )}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t('qrcode-decode.dropImage')}</p>
      </div>

      {previewUrl && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">{t('qrcode-decode.preview')}</Label>
          <img src={previewUrl} alt="" className="max-h-64 rounded-md border border-border bg-muted/30 object-contain" />
        </div>
      )}

      {result && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">{t('qrcode-decode.result')}</Label>
              <Badge variant="outline" className="font-mono text-xs">
                {t(`qrcode-decode.type.${result.type}`)}
              </Badge>
            </div>
            <div className="flex gap-2">
              {result.type === 'url' && (
                <Button variant="outline" size="sm" className="h-7 px-2 gap-1 text-xs" asChild>
                  <a href={result.text} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-3 w-3" />
                    {t('qrcode-decode.openUrl')}
                  </a>
                </Button>
              )}
              <Button variant="outline" size="sm" className="h-7 px-2 gap-1 text-xs" onClick={() => copy(result.text)}>
                {copiedText === result.text ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copiedText === result.text ? t('ui.copied', { ns: 'common' }) : t('ui.copy', { ns: 'common' })}
              </Button>
            </div>
          </div>
          <div className="font-mono text-sm bg-muted/50 rounded-md px-3 py-2 break-all select-all">
            {result.text}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>}
    </ToolLayout>
  )
}
