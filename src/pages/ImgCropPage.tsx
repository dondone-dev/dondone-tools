import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, ImageOff, Loader2, Upload, X } from 'lucide-react'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Button } from '@/components/ui/button'
import { CompressSettingsPanel } from '@/components/tools/CompressSettingsPanel'
import { ImageCropCanvas } from '@/components/tools/ImageCropCanvas'
import { cn } from '@/lib/utils'
import {
  buildOutputFilename,
  detectFormat,
  formatBytes,
  preloadCodecs,
  type CompressResult,
  type InputFormat,
  type OutputFormat,
} from '@/lib/tools/img-compress'
import {
  cropAndEncode,
  initialCropRect,
  loadImageBitmap,
  parseCustomRatio,
  type CropMode,
  type CropRect,
} from '@/lib/tools/img-crop'

const MAX_BYTES = 20 * 1024 * 1024

const PRESETS: { label: string; value: number }[] = [
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:2', value: 3 / 2 },
  { label: '16:9', value: 16 / 9 },
  { label: '9:16', value: 9 / 16 },
]

const MODE_LABEL_KEY: Record<CropMode, string> = {
  free: 'img-crop.modeFree',
  aspect: 'img-crop.modeAspect',
  fixed: 'img-crop.modeFixed',
}

export function ImgCropPage() {
  const { t } = useTranslation('tools')
  const inputRef = useRef<HTMLInputElement>(null)
  const objectUrlsRef = useRef<string[]>([])
  const bitmapRef = useRef<ImageBitmap | null>(null)

  const [dragOver, setDragOver] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [inputFormat, setInputFormat] = useState<InputFormat | null>(null)
  const [originalUrl, setOriginalUrl] = useState<string | null>(null)
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null)

  const [mode, setMode] = useState<CropMode>('free')
  const [presetRatio, setPresetRatio] = useState(1)
  const [customRatioInput, setCustomRatioInput] = useState('')
  const [fixedWidth, setFixedWidth] = useState(800)
  const [fixedHeight, setFixedHeight] = useState(600)
  const [rect, setRect] = useState<CropRect | null>(null)

  const [outputFormat, setOutputFormat] = useState<OutputFormat>('jpeg')
  const [quality, setQuality] = useState(85)
  const [lossless, setLossless] = useState(false)

  const [view, setView] = useState<'edit' | 'result'>('edit')
  const [resultTab, setResultTab] = useState<'original' | 'cropped'>('cropped')
  const [cropping, setCropping] = useState(false)
  const [result, setResult] = useState<CompressResult | null>(null)
  const [croppedUrl, setCroppedUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    preloadCodecs().catch(() => {})
  }, [])

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach(URL.revokeObjectURL)
      bitmapRef.current?.close()
    }
  }, [])

  function makeObjectUrl(blob: Blob | File): string {
    const url = URL.createObjectURL(blob)
    objectUrlsRef.current.push(url)
    return url
  }

  const effectiveRatio =
    mode === 'aspect' ? presetRatio : mode === 'fixed' ? (fixedWidth > 0 && fixedHeight > 0 ? fixedWidth / fixedHeight : null) : null

  const validFixedSize = Number.isInteger(fixedWidth) && Number.isInteger(fixedHeight) && fixedWidth > 0 && fixedHeight > 0

  const savings =
    result && file
      ? Math.round((1 - result.buffer.byteLength / file.size) * 100)
      : null

  async function accept(f: File) {
    const fmt = detectFormat(f)
    if (!fmt) { setError(t('img-crop.errorFormat')); return }
    if (f.size > MAX_BYTES) { setError(t('img-crop.errorSize')); return }

    try {
      const bitmap = await loadImageBitmap(f)

      objectUrlsRef.current.forEach(URL.revokeObjectURL)
      objectUrlsRef.current = []
      bitmapRef.current?.close()
      bitmapRef.current = bitmap

      setFile(f)
      setInputFormat(fmt)
      setOriginalUrl(makeObjectUrl(f))
      setNaturalSize({ w: bitmap.width, h: bitmap.height })
      setMode('free')
      setRect(initialCropRect(bitmap.width, bitmap.height, null))
      setResult(null)
      setCroppedUrl(null)
      setError(null)
      setView('edit')
      setOutputFormat(lossless && fmt === 'jpeg' ? 'png' : fmt)
    } catch {
      setError(t('img-crop.errorFormat'))
    }
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

  function handleModeChange(next: CropMode) {
    if (!naturalSize) return
    setMode(next)
    const ratio = next === 'aspect' ? presetRatio : next === 'fixed' ? (validFixedSize ? fixedWidth / fixedHeight : null) : null
    setRect(initialCropRect(naturalSize.w, naturalSize.h, ratio))
  }

  function handlePresetSelect(value: number) {
    setPresetRatio(value)
    setCustomRatioInput('')
    if (naturalSize) setRect(initialCropRect(naturalSize.w, naturalSize.h, value))
  }

  function handleCustomRatioChange(input: string) {
    setCustomRatioInput(input)
    const parsed = parseCustomRatio(input)
    if (parsed != null) {
      setPresetRatio(parsed)
      if (naturalSize) setRect(initialCropRect(naturalSize.w, naturalSize.h, parsed))
    }
  }

  function handleFixedSizeChange(w: number, h: number) {
    setFixedWidth(w)
    setFixedHeight(h)
    if (naturalSize && Number.isInteger(w) && Number.isInteger(h) && w > 0 && h > 0) {
      setRect(initialCropRect(naturalSize.w, naturalSize.h, w / h))
    }
  }

  function handleFormatSelect(fmt: OutputFormat) {
    setOutputFormat(fmt)
  }

  function handleLosslessChange(checked: boolean) {
    setLossless(checked)
    if (checked && outputFormat !== 'png' && outputFormat !== 'webp') {
      setOutputFormat('png')
    }
  }

  async function handleCrop() {
    if (!file || !rect || !bitmapRef.current || cropping) return
    if (mode === 'fixed' && !validFixedSize) return

    setCropping(true)
    setError(null)
    try {
      const fixedSize = mode === 'fixed' ? { width: fixedWidth, height: fixedHeight } : null
      const r = await cropAndEncode(bitmapRef.current, rect, mode, fixedSize, { outputFormat, quality, lossless })
      const blob = new Blob([r.buffer], { type: r.mimeType })
      if (croppedUrl) URL.revokeObjectURL(croppedUrl)
      const url = makeObjectUrl(blob)
      setResult(r)
      setCroppedUrl(url)
      setResultTab('cropped')
      setView('result')
    } catch {
      setError(t('img-crop.errorFailed'))
    } finally {
      setCropping(false)
    }
  }

  function handleDownload() {
    if (!result || !croppedUrl || !file) return
    const a = document.createElement('a')
    a.href = croppedUrl
    a.download = buildOutputFilename(file.name, result.extension)
    a.click()
  }

  function handleRecrop() {
    setView('edit')
  }

  function handleReset() {
    objectUrlsRef.current.forEach(URL.revokeObjectURL)
    objectUrlsRef.current = []
    bitmapRef.current?.close()
    bitmapRef.current = null
    setFile(null)
    setInputFormat(null)
    setOriginalUrl(null)
    setNaturalSize(null)
    setRect(null)
    setResult(null)
    setCroppedUrl(null)
    setError(null)
    setView('edit')
  }

  if (!file) {
    return (
      <ToolLayout toolId="img-crop" category="Image">
        <div
          role="button"
          tabIndex={0}
          aria-label={t('img-crop.drop')}
          className={cn(
            'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-8 py-16 text-center cursor-pointer transition-colors select-none',
            dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/60 hover:bg-muted/40',
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
              {dragOver ? t('img-crop.dragActive') : t('img-crop.drop')}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{t('img-crop.dropHint')}</p>
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

  return (
    <ToolLayout toolId="img-crop" category="Image">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {view === 'edit' ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_272px]">
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="flex items-center justify-between border-b px-4 py-2.5">
              <div className="flex gap-1" role="tablist">
                {(['free', 'aspect', 'fixed'] as CropMode[]).map((m) => (
                  <button
                    key={m}
                    role="tab"
                    aria-selected={mode === m}
                    onClick={() => handleModeChange(m)}
                    className={cn(
                      'rounded px-3 py-1 text-xs font-medium transition-colors',
                      mode === m ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {t(MODE_LABEL_KEY[m])}
                  </button>
                ))}
              </div>
              <span className="font-mono text-xs text-muted-foreground truncate max-w-[180px]">{file.name}</span>
            </div>

            {mode === 'aspect' && (
              <div className="flex flex-wrap items-center gap-1.5 border-b px-4 py-2.5">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => handlePresetSelect(p.value)}
                    className={cn(
                      'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                      presetRatio === p.value && !customRatioInput
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border text-muted-foreground hover:border-border/80',
                    )}
                  >
                    {p.label}
                  </button>
                ))}
                <input
                  type="text"
                  value={customRatioInput}
                  onChange={(e) => handleCustomRatioChange(e.target.value)}
                  placeholder={t('img-crop.customRatioPlaceholder')}
                  className="w-24 rounded-md border border-border bg-transparent px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            )}

            {mode === 'fixed' && (
              <div className="flex items-center gap-2 border-b px-4 py-2.5">
                <label className="text-xs text-muted-foreground">{t('img-crop.widthLabel')}</label>
                <input
                  type="number"
                  min={1}
                  value={fixedWidth}
                  onChange={(e) => handleFixedSizeChange(Number(e.target.value), fixedHeight)}
                  className="w-20 rounded-md border border-border bg-transparent px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <span className="text-xs text-muted-foreground">×</span>
                <label className="text-xs text-muted-foreground">{t('img-crop.heightLabel')}</label>
                <input
                  type="number"
                  min={1}
                  value={fixedHeight}
                  onChange={(e) => handleFixedSizeChange(fixedWidth, Number(e.target.value))}
                  className="w-20 rounded-md border border-border bg-transparent px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <span className="text-xs text-muted-foreground">{t('img-crop.pixelsUnit')}</span>
              </div>
            )}

            <div className="flex min-h-[240px] items-center justify-center bg-[repeating-conic-gradient(hsl(var(--muted))_0%_25%,hsl(var(--background))_0%_50%)] bg-[length:16px_16px] p-4">
              {originalUrl && naturalSize && rect && (
                <ImageCropCanvas
                  imageUrl={originalUrl}
                  naturalWidth={naturalSize.w}
                  naturalHeight={naturalSize.h}
                  rect={rect}
                  ratio={effectiveRatio}
                  onChange={setRect}
                />
              )}
            </div>
          </div>

          <div className="flex flex-col rounded-xl border bg-card overflow-hidden">
            <CompressSettingsPanel
              inputFormat={inputFormat}
              outputFormat={outputFormat}
              quality={quality}
              lossless={lossless}
              onFormatChange={handleFormatSelect}
              onQualityChange={setQuality}
              onLosslessChange={handleLosslessChange}
            />

            <div className="flex flex-col gap-2 p-4">
              {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
              {mode === 'fixed' && !validFixedSize && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{t('img-crop.invalidSize')}</p>
              )}
              <Button onClick={handleCrop} disabled={cropping || (mode === 'fixed' && !validFixedSize)} className="w-full">
                {cropping ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />{t('img-crop.cropping')}</>
                ) : (
                  t('img-crop.cropButton')
                )}
              </Button>
              <button
                onClick={handleReset}
                className="flex w-full items-center justify-center gap-1.5 rounded-md py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-3 w-3" />
                {t('img-crop.remove')}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <div className="flex gap-1" role="tablist">
              {(['original', 'cropped'] as const).map((tb) => (
                <button
                  key={tb}
                  role="tab"
                  aria-selected={resultTab === tb}
                  onClick={() => setResultTab(tb)}
                  className={cn(
                    'rounded px-3 py-1 text-xs font-medium transition-colors',
                    resultTab === tb ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {tb === 'original' ? t('img-crop.tabOriginal') : t('img-crop.tabCropped')}
                </button>
              ))}
            </div>
            <span className="font-mono text-xs text-muted-foreground truncate max-w-[180px]">{file.name}</span>
          </div>

          <div className="relative flex min-h-[240px] items-center justify-center bg-[repeating-conic-gradient(hsl(var(--muted))_0%_25%,hsl(var(--background))_0%_50%)] bg-[length:16px_16px]">
            {resultTab === 'original' && originalUrl ? (
              <img src={originalUrl} alt={t('img-crop.tabOriginal')} className="max-h-[320px] max-w-full object-contain" />
            ) : resultTab === 'cropped' && croppedUrl ? (
              <img src={croppedUrl} alt={t('img-crop.tabCropped')} className="max-h-[320px] max-w-full object-contain" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground/40 py-12">
                <ImageOff className="h-8 w-8" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 divide-x border-t text-center">
            <div className="px-4 py-3">
              <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{t('img-crop.tabOriginal')}</p>
              <p className="mt-0.5 font-mono text-base font-semibold tabular-nums">{formatBytes(file.size)}</p>
              {naturalSize && <p className="text-[10px] text-muted-foreground">{naturalSize.w}×{naturalSize.h}</p>}
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
              <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{t('img-crop.tabCropped')}</p>
              <p className="mt-0.5 font-mono text-base font-semibold tabular-nums text-emerald-500">
                {result ? formatBytes(result.buffer.byteLength) : '—'}
              </p>
              {result && <p className="text-[10px] text-muted-foreground">{result.width}×{result.height}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-2 p-4">
            <Button variant="outline" onClick={handleRecrop} className="w-full">
              {t('img-crop.recrop')}
            </Button>
            <Button onClick={handleDownload} className="w-full gap-2">
              <Download className="h-4 w-4" />
              {t('img-crop.download')}
            </Button>
            <button
              onClick={handleReset}
              className="flex w-full items-center justify-center gap-1.5 rounded-md py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-3 w-3" />
              {t('img-crop.remove')}
            </button>
          </div>
        </div>
      )}
    </ToolLayout>
  )
}
