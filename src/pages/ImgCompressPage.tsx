import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, ImageOff, Loader2, Upload, X } from 'lucide-react'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Button } from '@/components/ui/button'
import { CompressSettingsPanel } from '@/components/tools/CompressSettingsPanel'
import { cn } from '@/lib/utils'
import {
  buildOutputFilename,
  compressImage,
  detectFormat,
  formatBytes,
  preloadCodecs,
  type CompressResult,
  type InputFormat,
  type OutputFormat,
} from '@/lib/tools/img-compress'

const MAX_BYTES = 20 * 1024 * 1024

type Tab = 'original' | 'compressed'

export function ImgCompressPage() {
  const { t } = useTranslation('tools')
  const inputRef = useRef<HTMLInputElement>(null)
  const objectUrlsRef = useRef<string[]>([])

  const [dragOver, setDragOver] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [inputFormat, setInputFormat] = useState<InputFormat | null>(null)
  const [originalUrl, setOriginalUrl] = useState<string | null>(null)

  const [outputFormat, setOutputFormat] = useState<OutputFormat>('jpeg')
  const [quality, setQuality] = useState(85)
  const [lossless, setLossless] = useState(false)

  const [tab, setTab] = useState<Tab>('original')
  const [compressing, setCompressing] = useState(false)
  const [result, setResult] = useState<CompressResult | null>(null)
  const [compressedUrl, setCompressedUrl] = useState<string | null>(null)
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Start loading codecs in background when the page mounts
  useEffect(() => {
    preloadCodecs().catch(() => {})
  }, [])

  useEffect(() => {
    return () => { objectUrlsRef.current.forEach(URL.revokeObjectURL) }
  }, [])

  useEffect(() => {
    if (!file) { setNaturalSize(null); return }
    createImageBitmap(file).then(bmp => {
      setNaturalSize({ w: bmp.width, h: bmp.height })
      bmp.close()
    }).catch(() => {})
  }, [file])

  function makeObjectUrl(blob: Blob | File): string {
    const url = URL.createObjectURL(blob)
    objectUrlsRef.current.push(url)
    return url
  }

  function accept(f: File) {
    const fmt = detectFormat(f)
    if (!fmt) { setError(t('img-compress.errorFormat')); return }
    if (f.size > MAX_BYTES) { setError(t('img-compress.errorSize')); return }

    // Revoke previous URLs
    objectUrlsRef.current.forEach(URL.revokeObjectURL)
    objectUrlsRef.current = []

    setFile(f)
    setInputFormat(fmt)
    setOriginalUrl(makeObjectUrl(f))
    setResult(null)
    setCompressedUrl(null)
    setError(null)
    setTab('original')
    setOutputFormat(lossless && fmt === 'jpeg' ? 'png' : fmt)
  }

  function handleFiles(list: FileList | null) {
    if (!list || list.length === 0) return
    accept(list[0])
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  function handleFormatSelect(fmt: OutputFormat) {
    setOutputFormat(fmt)
    setResult(null)
    setCompressedUrl(null)
    if (tab === 'compressed') setTab('original')
  }

  function handleQualityChange(v: number) {
    setQuality(v)
    setResult(null)
    setCompressedUrl(null)
  }

  function handleLosslessChange(checked: boolean) {
    setLossless(checked)
    // If the currently-selected format becomes disabled, pick the next safe one
    if (checked && outputFormat !== 'png' && outputFormat !== 'webp') {
      setOutputFormat('png')
    }
    setResult(null)
    setCompressedUrl(null)
    if (tab === 'compressed') setTab('original')
  }

  async function handleCompress() {
    if (!file || !inputFormat || compressing) return
    setCompressing(true)
    setError(null)
    try {
      const r = await compressImage(file, { outputFormat, quality, lossless })
      const blob = new Blob([r.buffer], { type: r.mimeType })
      const url = makeObjectUrl(blob)
      setResult(r)
      setCompressedUrl(url)
      setTab('compressed')
    } catch {
      setError(t('img-compress.errorFailed'))
    } finally {
      setCompressing(false)
    }
  }

  function handleDownload() {
    if (!result || !compressedUrl || !file) return
    const a = document.createElement('a')
    a.href = compressedUrl
    a.download = buildOutputFilename(file.name, result.extension)
    a.click()
  }

  function handleReset() {
    objectUrlsRef.current.forEach(URL.revokeObjectURL)
    objectUrlsRef.current = []
    setFile(null)
    setInputFormat(null)
    setOriginalUrl(null)
    setResult(null)
    setCompressedUrl(null)
    setError(null)
    setTab('original')
  }

  const savings =
    result && file
      ? Math.round((1 - result.buffer.byteLength / file.size) * 100)
      : null

  // ── Upload zone ──────────────────────────────────────────────────────────────
  if (!file) {
    return (
      <ToolLayout toolId="img-compress" category="Image">
        <div
          role="button"
          tabIndex={0}
          aria-label={t('img-compress.drop')}
          className={cn(
            'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-8 py-16 text-center cursor-pointer transition-colors select-none',
            dragOver
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/60 hover:bg-muted/40',
          )}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click() } }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <div className="rounded-xl bg-muted p-3 text-muted-foreground">
            <Upload className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {dragOver ? t('img-compress.dragActive') : t('img-compress.drop')}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{t('img-compress.dropHint')}</p>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </ToolLayout>
    )
  }

  // ── Loaded state ─────────────────────────────────────────────────────────────
  return (
    <ToolLayout toolId="img-compress" category="Image">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_272px]">

        {/* ── Preview panel ── */}
        <div className="rounded-xl border bg-card overflow-hidden">
          {/* Tabs */}
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <div className="flex gap-1" role="tablist">
              {(['original', 'compressed'] as Tab[]).map((t_) => (
                <button
                  key={t_}
                  role="tab"
                  aria-selected={tab === t_}
                  disabled={t_ === 'compressed' && !compressedUrl}
                  onClick={() => setTab(t_)}
                  className={cn(
                    'rounded px-3 py-1 text-xs font-medium transition-colors',
                    tab === t_
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground',
                    t_ === 'compressed' && !compressedUrl && 'opacity-40 cursor-not-allowed',
                  )}
                >
                  {t_ === 'original' ? t('img-compress.tabOriginal') : t('img-compress.tabCompressed')}
                </button>
              ))}
            </div>
            <span className="font-mono text-xs text-muted-foreground truncate max-w-[180px]">
              {file.name}
            </span>
          </div>

          {/* Image area — checkerboard via CSS for transparent images */}
          <div
            className="relative flex min-h-[240px] items-center justify-center bg-[repeating-conic-gradient(hsl(var(--muted))_0%_25%,hsl(var(--background))_0%_50%)] bg-[length:16px_16px]"
            aria-label={tab === 'original' ? t('img-compress.tabOriginal') : t('img-compress.tabCompressed')}
          >
            {tab === 'original' && originalUrl ? (
              <img
                src={originalUrl}
                alt={t('img-compress.tabOriginal')}
                className="max-h-[320px] max-w-full object-contain"
              />
            ) : tab === 'compressed' && compressedUrl ? (
              <img
                src={compressedUrl}
                alt={t('img-compress.tabCompressed')}
                className="max-h-[320px] max-w-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground/40 py-12">
                <ImageOff className="h-8 w-8" />
              </div>
            )}
            {compressing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/70">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">{t('img-compress.compressing')}</span>
              </div>
            )}
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-3 divide-x border-t text-center">
            <div className="px-4 py-3">
              <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{t('img-compress.tabOriginal')}</p>
              <p className="mt-0.5 font-mono text-base font-semibold tabular-nums">{formatBytes(file.size)}</p>
              {naturalSize && (
                <p className="text-[10px] text-muted-foreground">{naturalSize.w}×{naturalSize.h}</p>
              )}
            </div>
            <div className="flex flex-col items-center justify-center px-4 py-3">
              {savings != null ? (
                <>
                  <p className={cn('font-mono text-sm font-bold tabular-nums', savings >= 0 ? 'text-emerald-500' : 'text-destructive')}>
                    {savings >= 0 ? `−${savings}%` : `+${Math.abs(savings)}%`}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{savings >= 0 ? t('img-compress.saved') : t('img-compress.larger')}</p>
                </>
              ) : (
                <p className="text-[10px] text-muted-foreground">—</p>
              )}
            </div>
            <div className="px-4 py-3 text-right">
              <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{t('img-compress.tabCompressed')}</p>
              <p className={cn('mt-0.5 font-mono text-base font-semibold tabular-nums', result ? 'text-emerald-500' : 'text-muted-foreground/40')}>
                {result ? formatBytes(result.buffer.byteLength) : '—'}
              </p>
              {result && (
                <p className="text-[10px] text-muted-foreground">{result.width}×{result.height}</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Settings panel ── */}
        <div className="flex flex-col rounded-xl border bg-card overflow-hidden">
          <CompressSettingsPanel
            inputFormat={inputFormat}
            outputFormat={outputFormat}
            quality={quality}
            lossless={lossless}
            onFormatChange={handleFormatSelect}
            onQualityChange={handleQualityChange}
            onLosslessChange={handleLosslessChange}
          />

          {/* Actions */}
          <div className="flex flex-col gap-2 p-4">
            {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
            <Button onClick={handleCompress} disabled={compressing} className="w-full">
              {compressing ? (
                <><Loader2 className="h-4 w-4 animate-spin" />{t('img-compress.compressing')}</>
              ) : (
                t('img-compress.compress')
              )}
            </Button>
            {result && compressedUrl && (
              <Button variant="outline" onClick={handleDownload} className="w-full gap-2">
                <Download className="h-4 w-4" />
                {t('img-compress.download')}
              </Button>
            )}
            <button
              onClick={handleReset}
              className="flex w-full items-center justify-center gap-1.5 rounded-md py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-3 w-3" />
              {t('img-compress.remove')}
            </button>
          </div>
        </div>
      </div>
    </ToolLayout>
  )
}
