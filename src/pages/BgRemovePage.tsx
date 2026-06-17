import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, Loader2, Upload, ZoomIn, ZoomOut } from 'lucide-react'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Button } from '@/components/ui/button'
import {
  removeBackground,
  disposeWorker,
  isModelReady,
  BgRemoveError,
  type BgRemoveBackend,
} from '@/lib/tools/bg-remove'
import { cn } from '@/lib/utils'

type Status = 'idle' | 'loading-model' | 'processing' | 'done' | 'error'

export function BgRemovePage() {
  const { t } = useTranslation(['tools', 'common'])
  const inputRef = useRef<HTMLInputElement>(null)
  const originalUrlRef = useRef('')
  const resultUrlRef = useRef('')

  const [status, setStatus] = useState<Status>('idle')
  const [dragOver, setDragOver] = useState(false)
  const [originalUrl, setOriginalUrl] = useState('')
  const [resultUrl, setResultUrl] = useState('')
  const [resultBlob, setResultBlob] = useState<Blob | null>(null)
  const [error, setError] = useState('')
  const [modelProgress, setModelProgress] = useState({ loaded: 0, total: 0 })
  const [backend, setBackend] = useState<BgRemoveBackend | null>(null)
  const [zoom, setZoom] = useState<1 | 2>(1)

  useEffect(() => {
    return () => {
      if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current)
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current)
      disposeWorker()
    }
  }, [])

  async function handleFile(file: File) {
    setError('')
    setResultBlob(null)
    setZoom(1)

    if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current)
    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current)
    resultUrlRef.current = ''
    setResultUrl('')

    const url = URL.createObjectURL(file)
    originalUrlRef.current = url
    setOriginalUrl(url)

    const initialStatus = isModelReady() ? 'processing' : 'loading-model'
    setStatus(initialStatus)
    setModelProgress({ loaded: 0, total: 0 })

    try {
      const blob = await removeBackground(file, {
        onProgress: (loaded, total) => {
          setModelProgress({ loaded, total })
        },
        onModelReady: (b) => {
          setBackend(b)
          setStatus('processing')
        },
      })

      const blobUrl = URL.createObjectURL(blob)
      resultUrlRef.current = blobUrl
      setResultUrl(blobUrl)
      setResultBlob(blob)
      setStatus('done')
    } catch (err) {
      const key =
        err instanceof BgRemoveError && err.kind === 'format'
          ? 'bg-remove.errorFormat'
          : err instanceof BgRemoveError && err.kind === 'size'
            ? 'bg-remove.errorSize'
            : err instanceof BgRemoveError && err.kind === 'load'
              ? 'bg-remove.errorLoad'
              : err instanceof BgRemoveError && err.kind === 'oom'
                ? 'bg-remove.errorOom'
                : 'bg-remove.errorProcess'
      setError(t(key, { ns: 'tools' }))
      setStatus('error')
    }
  }

  function handleFiles(files: FileList | null) {
    const file = files?.[0]
    if (file) handleFile(file)
  }

  function handleDownload() {
    if (!resultBlob) return
    const a = document.createElement('a')
    a.href = resultUrlRef.current
    a.download = 'bg-removed.png'
    a.click()
  }

  function handleRetry() {
    setStatus('idle')
    setOriginalUrl('')
    setResultUrl('')
    setResultBlob(null)
    setError('')
    if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current)
    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current)
    originalUrlRef.current = ''
    resultUrlRef.current = ''
  }

  const isProcessing = status === 'loading-model' || status === 'processing'
  const progressLabel =
    modelProgress.total > 0
      ? t('bg-remove.loadingModel', {
          ns: 'tools',
          loaded: (modelProgress.loaded / 1024 / 1024).toFixed(1),
          total: (modelProgress.total / 1024 / 1024).toFixed(1),
        })
      : t('bg-remove.loadingModelIndeterminate', { ns: 'tools' })

  const backendBadge = backend ? (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-sm font-medium shrink-0',
        backend === 'webgpu'
          ? 'text-green-700 dark:text-green-400'
          : 'text-yellow-700 dark:text-yellow-500',
      )}
    >
      <span
        className={cn(
          'inline-block h-1.5 w-1.5 rounded-full',
          backend === 'webgpu' ? 'bg-green-500' : 'bg-yellow-500',
        )}
      />
      {backend === 'webgpu'
        ? t('bg-remove.backend_gpu', { ns: 'tools' })
        : t('bg-remove.backend_wasm', { ns: 'tools' })}
    </span>
  ) : null

  return (
    <ToolLayout toolId="bg-remove" category="Image" headerExtra={backendBadge}>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Model loading progress bar */}
      {status === 'loading-model' && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          <span>{progressLabel}</span>
        </div>
      )}

      {/* Upload dropzone — hidden when showing results */}
      {status !== 'done' && (
        <div
          role="button"
          tabIndex={0}
          aria-label={t('bg-remove.dropImage', { ns: 'tools' })}
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
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              if (!isProcessing) inputRef.current?.click()
            }
          }}
        >
          {status === 'processing' ? (
            <div className="flex flex-col items-center justify-center gap-3 py-4">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {t('bg-remove.processing', { ns: 'tools' })}
              </span>
            </div>
          ) : originalUrl ? (
            <img
              src={originalUrl}
              alt=""
              className="max-h-48 max-w-full mx-auto rounded object-contain"
            />
          ) : (
            <>
              <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {t('bg-remove.dropImage', { ns: 'tools' })}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                {t('bg-remove.supportedFormats', { ns: 'tools' })}
              </p>
            </>
          )}
        </div>
      )}

      {/* Error state */}
      {status === 'error' && (
        <div className="flex items-center gap-3">
          <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md flex-1">
            {error}
          </p>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            {t('bg-remove.retry', { ns: 'tools' })}
          </Button>
        </div>
      )}

      {/* Result: side-by-side comparison */}
      {status === 'done' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Original */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t('bg-remove.original', { ns: 'tools' })}
              </p>
              <div className="rounded-lg overflow-hidden border border-border">
                <img
                  src={originalUrl}
                  alt={t('bg-remove.original', { ns: 'tools' })}
                  className="w-full object-contain max-h-80"
                />
              </div>
            </div>

            {/* Result with checkerboard + zoom */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t('bg-remove.result', { ns: 'tools' })}
              </p>
              <div
                className={cn(
                  'relative overflow-hidden rounded-lg border border-border',
                  '[--checker-a:#e5e7eb] dark:[--checker-a:#374151]',
                  '[--checker-b:#ffffff] dark:[--checker-b:#1f2937]',
                )}
                style={{
                  backgroundImage: [
                    'linear-gradient(45deg, var(--checker-a) 25%, transparent 25%)',
                    'linear-gradient(-45deg, var(--checker-a) 25%, transparent 25%)',
                    'linear-gradient(45deg, transparent 75%, var(--checker-a) 75%)',
                    'linear-gradient(-45deg, transparent 75%, var(--checker-a) 75%)',
                  ].join(', '),
                  backgroundSize: '16px 16px',
                  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                  backgroundColor: 'var(--checker-b)',
                }}
              >
                <img
                  src={resultUrl}
                  alt={t('bg-remove.result', { ns: 'tools' })}
                  className={cn(
                    'w-full object-contain max-h-80 transition-transform duration-200 origin-center',
                    zoom === 1 ? 'cursor-zoom-in' : 'scale-[2] cursor-zoom-out',
                  )}
                  onClick={() => setZoom((z) => (z === 1 ? 2 : 1))}
                />
                <button
                  className="absolute top-2 right-2 rounded-md bg-background/80 p-1.5 backdrop-blur-sm"
                  onClick={() => setZoom((z) => (z === 1 ? 2 : 1))}
                  aria-label={
                    zoom === 1
                      ? t('bg-remove.zoomIn', { ns: 'tools' })
                      : t('bg-remove.zoomOut', { ns: 'tools' })
                  }
                >
                  {zoom === 1 ? (
                    <ZoomIn className="h-4 w-4" />
                  ) : (
                    <ZoomOut className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button onClick={handleDownload} className="gap-2">
              <Download className="h-4 w-4" />
              {t('bg-remove.download', { ns: 'tools' })}
            </Button>
            <Button variant="outline" onClick={() => { handleRetry(); inputRef.current?.click() }}>
              {t('bg-remove.uploadAnother', { ns: 'tools' })}
            </Button>
          </div>
        </div>
      )}
    </ToolLayout>
  )
}
