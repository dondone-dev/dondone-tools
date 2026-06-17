import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Copy, Loader2, Upload } from 'lucide-react'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Button } from '@/components/ui/button'
import { useClipboard } from '@/hooks/useClipboard'
import { recognizeImage, disposeOcr, isOcrStarted, warmUpOcr, OcrError } from '@/lib/tools/ocr'
import { cn } from '@/lib/utils'

type Status = 'idle' | 'loading' | 'recognizing' | 'done' | 'error'

export function OcrPage() {
  const { t } = useTranslation(['tools', 'common'])
  const inputRef = useRef<HTMLInputElement>(null)
  const objectUrlRef = useRef('')
  const [dragOver, setDragOver] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [modelReady, setModelReady] = useState(false)
  const { copiedText, copy } = useClipboard()

  useEffect(() => {
    warmUpOcr().then(() => setModelReady(true)).catch(() => {})
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
      disposeOcr()
    }
  }, [])

  async function handleFile(file: File) {
    setError('')
    setResult(null)

    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    const url = URL.createObjectURL(file)
    objectUrlRef.current = url
    setPreviewUrl(url)

    setStatus(isOcrStarted() ? 'recognizing' : 'loading')

    try {
      const text = await recognizeImage(file)
      setResult(text)
      setStatus('done')
    } catch (e) {
      if (e instanceof OcrError) {
        setError(t(`ocr.error_${e.kind}`, { ns: 'tools' }))
      } else {
        setError(t('ocr.error_inference', { ns: 'tools' }))
      }
      setStatus('error')
    }
  }

  function handleFiles(files: FileList | null) {
    const file = files?.[0]
    if (file) handleFile(file)
  }

  const isProcessing = status === 'loading' || status === 'recognizing'
  const showModelBar = !modelReady && status === 'idle'

  return (
    <ToolLayout toolId="ocr" category="Image">
      {showModelBar && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          <span>{t('ocr.loading_model', { ns: 'tools' })}</span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/bmp"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div
        role="button"
        tabIndex={0}
        aria-label={t('ocr.dropzone', { ns: 'tools' })}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
          dragOver
            ? 'border-foreground/50 bg-muted/50'
            : 'border-border hover:border-foreground/30 focus-visible:border-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          isProcessing && 'pointer-events-none opacity-60',
        )}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
        onClick={() => !isProcessing && inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click() } }}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt=""
            className="max-h-48 max-w-full mx-auto rounded object-contain"
          />
        ) : (
          <>
            <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t('ocr.dropzone', { ns: 'tools' })}</p>
            <p className="text-xs text-muted-foreground/60 mt-1">{t('ocr.dropzone_hint', { ns: 'tools' })}</p>
          </>
        )}
      </div>

      {isProcessing && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          <span>
            {status === 'loading'
              ? t('ocr.loading_model', { ns: 'tools' })
              : t('ocr.recognizing', { ns: 'tools' })}
          </span>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
      )}

      {result !== null && status === 'done' && (
        <div className="relative group">
          <textarea
            readOnly
            value={result}
            placeholder={t('ocr.result_placeholder', { ns: 'tools' })}
            className="w-full min-h-36 p-3 pr-12 text-sm font-mono rounded-md border border-border bg-muted/30 resize-y focus:outline-none"
          />
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-7 w-7 p-0"
            onClick={() => copy(result)}
            aria-label={copiedText === result ? t('ui.copied', { ns: 'common' }) : t('ui.copy', { ns: 'common' })}
          >
            {copiedText === result
              ? <Check className="h-3.5 w-3.5" />
              : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>
      )}
    </ToolLayout>
  )
}
