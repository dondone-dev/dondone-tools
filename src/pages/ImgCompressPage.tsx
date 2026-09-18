import { useEffect, useRef, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, FileArchive, Loader2, Plus, RefreshCw, Trash2, Upload, X } from 'lucide-react'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Button } from '@/components/ui/button'
import { CompressSettingsPanel } from '@/components/tools/CompressSettingsPanel'
import { cn } from '@/lib/utils'
import {
  buildOutputFilename,
  compressImage,
  createZipBundle,
  detectFormat,
  formatBytes,
  preloadCodecs,
  MAX_FILE_BYTES,
  MAX_IMAGES,
  type CompressResult,
  type InputFormat,
  type OutputFormat,
} from '@/lib/tools/img-compress'

interface BatchItem {
  id: string
  file: File
  previewUrl: string
  inputFormat: InputFormat | null
  status: 'pending' | 'processing' | 'done' | 'error'
  result?: CompressResult
  compressedUrl?: string
  errorMessage?: string
}

const CONCURRENCY = 2

export function ImgCompressPage() {
  const { t } = useTranslation('tools')
  const inputRef = useRef<HTMLInputElement>(null)
  const appendInputRef = useRef<HTMLInputElement>(null)
  const objectUrlsRef = useRef<string[]>([])
  const processingIdsRef = useRef<Set<string>>(new Set())
  const itemsRef = useRef<BatchItem[]>([])
  const scheduleNextJobsRef = useRef<(opts: { format: OutputFormat; qual: number; loss: boolean }) => void>(() => {})

  const [items, setItems] = useState<BatchItem[]>([])
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('auto')
  const [quality, setQuality] = useState(85)
  const [lossless, setLossless] = useState(false)
  const [zipping, setZipping] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [bannerError, setBannerError] = useState<string | null>(null)

  // Keep itemsRef in sync with state for queue scheduler
  useEffect(() => {
    itemsRef.current = items
  }, [items])

  // Preload codecs on mount and cleanup URLs on unmount
  useEffect(() => {
    preloadCodecs().catch(() => {})
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  function makeObjectUrl(blob: Blob | File): string {
    const url = URL.createObjectURL(blob)
    objectUrlsRef.current.push(url)
    return url
  }

  const scheduleNextJobs = useCallback(
    (opts: { format: OutputFormat; qual: number; loss: boolean }) => {
      const currentItems = itemsRef.current
      const processing = processingIdsRef.current

      while (processing.size < CONCURRENCY) {
        const nextItem = currentItems.find(
          (it) => it.status === 'pending' && !processing.has(it.id)
        )
        if (!nextItem) break

        const targetId = nextItem.id
        processing.add(targetId)

        setItems((prev) =>
          prev.map((it) => (it.id === targetId ? { ...it, status: 'processing' } : it))
        )

        compressImage(nextItem.file, {
          outputFormat: opts.format,
          quality: opts.qual,
          lossless: opts.loss,
        })
          .then((result) => {
            const blob = new Blob([result.buffer], { type: result.mimeType })
            const compressedUrl = makeObjectUrl(blob)
            setItems((prev) =>
              prev.map((it) =>
                it.id === targetId
                  ? { ...it, status: 'done', result, compressedUrl }
                  : it
              )
            )
          })
          .catch(() => {
            setItems((prev) =>
              prev.map((it) =>
                it.id === targetId
                  ? { ...it, status: 'error', errorMessage: t('img-compress.errorFailed') }
                  : it
              )
            )
          })
          .finally(() => {
            processing.delete(targetId)
            scheduleNextJobsRef.current(opts)
          })
      }
    },
    [t]
  )
  useEffect(() => {
    scheduleNextJobsRef.current = scheduleNextJobs
  }, [scheduleNextJobs])


  const addFiles = useCallback(
    (fileList: FileList | File[]) => {
      setBannerError(null)
      const rawFiles = Array.from(fileList)
      if (rawFiles.length === 0) return

      const currentItems = itemsRef.current
      const availableSlots = MAX_IMAGES - currentItems.length

      if (availableSlots <= 0) {
        setBannerError(t('img-compress.errorLimit'))
        return
      }

      let filesToAdd = rawFiles
      if (rawFiles.length > availableSlots) {
        filesToAdd = rawFiles.slice(0, availableSlots)
        setBannerError(t('img-compress.errorLimit'))
      }

      const newItems: BatchItem[] = filesToAdd.map((file) => {
        const fmt = detectFormat(file)
        const id = `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 9)}`
        const previewUrl = makeObjectUrl(file)

        if (!fmt) {
          return {
            id,
            file,
            previewUrl,
            inputFormat: null,
            status: 'error',
            errorMessage: t('img-compress.errorFormat'),
          }
        }

        if (file.size > MAX_FILE_BYTES) {
          return {
            id,
            file,
            previewUrl,
            inputFormat: fmt,
            status: 'error',
            errorMessage: t('img-compress.errorSize'),
          }
        }

        return {
          id,
          file,
          previewUrl,
          inputFormat: fmt,
          status: 'pending',
        }
      })

      const updated = [...currentItems, ...newItems]
      itemsRef.current = updated
      setItems(updated)

      // Start queue processing with current options
      setTimeout(() => {
        scheduleNextJobs({ format: outputFormat, qual: quality, loss: lossless })
      }, 0)
    },
    [outputFormat, quality, lossless, scheduleNextJobs, t]
  )

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files) {
      addFiles(e.dataTransfer.files)
    }
  }

  function handleFormatChange(fmt: OutputFormat) {
    setOutputFormat(fmt)
  }

  function handleQualityChange(q: number) {
    setQuality(q)
  }

  function handleLosslessChange(loss: boolean) {
    setLossless(loss)
    if (loss && outputFormat === 'jpeg') {
      setOutputFormat('png')
    }
  }

  function handleRecompressAll() {
    processingIdsRef.current.clear()
    const reset = itemsRef.current.map((it) =>
      it.inputFormat && it.file.size <= MAX_FILE_BYTES
        ? { ...it, status: 'pending' as const, result: undefined, compressedUrl: undefined, errorMessage: undefined }
        : it
    )
    itemsRef.current = reset
    setItems(reset)
    setTimeout(() => {
      scheduleNextJobs({ format: outputFormat, qual: quality, loss: lossless })
    }, 0)
  }

  function handleRemoveItem(id: string) {
    processingIdsRef.current.delete(id)
    const target = itemsRef.current.find((it) => it.id === id)
    if (target) {
      if (target.previewUrl) URL.revokeObjectURL(target.previewUrl)
      if (target.compressedUrl) URL.revokeObjectURL(target.compressedUrl)
    }
    const updated = itemsRef.current.filter((it) => it.id !== id)
    itemsRef.current = updated
    setItems(updated)
  }

  function handleClearAll() {
    processingIdsRef.current.clear()
    for (const it of itemsRef.current) {
      if (it.previewUrl) URL.revokeObjectURL(it.previewUrl)
      if (it.compressedUrl) URL.revokeObjectURL(it.compressedUrl)
    }
    objectUrlsRef.current = []
    itemsRef.current = []
    setItems([])
    setBannerError(null)
  }

  function handleDownloadItem(item: BatchItem) {
    if (!item.result || !item.compressedUrl) return
    const a = document.createElement('a')
    a.href = item.compressedUrl
    a.download = buildOutputFilename(item.file.name, item.result.extension)
    a.click()
  }

  async function handleDownloadAllZip() {
    const doneItems = items.filter(
      (it): it is BatchItem & { result: CompressResult } =>
        it.status === 'done' && it.result != null
    )
    if (doneItems.length === 0 || zipping) return
    setZipping(true)
    try {
      const zipBlob = await createZipBundle(
        doneItems.map((it) => ({
          name: buildOutputFilename(it.file.name, it.result.extension),
          buffer: it.result.buffer,
        }))
      )
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'compressed_images.zip'
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setZipping(false)
    }
  }

  const doneCount = items.filter((it) => it.status === 'done').length
  const isAnyProcessing = items.some((it) => it.status === 'processing')
  const doneItems = items.filter(
    (it): it is BatchItem & { result: CompressResult } => it.status === 'done' && it.result != null
  )

  const originalBytesOfDone = doneItems.reduce((sum, it) => sum + it.file.size, 0)
  const compressedBytesOfDone = doneItems.reduce(
    (sum, it) => sum + it.result.buffer.byteLength,
    0
  )
  const savedBytes = originalBytesOfDone - compressedBytesOfDone
  const savingsPercent =
    originalBytesOfDone > 0 ? Math.round((savedBytes / originalBytesOfDone) * 100) : 0

  return (
    <ToolLayout toolId="img-compress" category="Image">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files)
          e.target.value = ''
        }}
      />
      <input
        ref={appendInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files)
          e.target.value = ''
        }}
      />

      {bannerError && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-2.5 text-xs text-destructive flex items-center justify-between gap-2">
          <span>{bannerError}</span>
          <button
            type="button"
            onClick={() => setBannerError(null)}
            className="text-destructive/80 hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {items.length === 0 ? (
        /* Empty Upload Zone */
        <div
          role="button"
          tabIndex={0}
          aria-label={t('img-compress.drop')}
          className={cn(
            'flex flex-col items-center justify-center gap-3.5 rounded-xl border-2 border-dashed px-8 py-20 text-center cursor-pointer transition-colors select-none',
            dragOver
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/60 hover:bg-muted/30'
          )}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              inputRef.current?.click()
            }
          }}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <div className="rounded-xl bg-muted p-3.5 text-muted-foreground">
            <Upload className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-semibold text-foreground">
              {dragOver ? t('img-compress.dragActive') : t('img-compress.drop')}
            </p>
            <p className="text-xs text-muted-foreground">{t('img-compress.maxImagesHint')}</p>
          </div>
        </div>
      ) : (
        /* Batch Active Layout */
        <div className="grid gap-6 lg:grid-cols-[1fr_280px] items-start">
          {/* Left: Task List & Summary */}
          <div className="space-y-3 min-w-0">
            {/* Summary Card */}
            <section className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5 min-w-0">
                  <div className="text-sm font-semibold flex items-center gap-2">
                    <span>
                      {t('img-compress.batchSummary', { done: doneCount, total: items.length })}
                    </span>
                    {isAnyProcessing && (
                      <span className="flex items-center gap-1 text-xs text-primary font-normal">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        {t('img-compress.statusProcessing')}
                      </span>
                    )}
                  </div>
                  {doneCount > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(originalBytesOfDone)} →{' '}
                      <span className="font-semibold text-foreground">
                        {formatBytes(compressedBytesOfDone)}
                      </span>
                      {' · '}
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {t('img-compress.batchSaved', {
                          saved: formatBytes(Math.max(0, savedBytes)),
                          percent: savingsPercent,
                        })}
                      </span>
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    disabled={doneCount === 0 || zipping}
                    onClick={handleDownloadAllZip}
                    className="gap-1.5"
                  >
                    {zipping ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FileArchive className="h-3.5 w-3.5" />
                    )}
                    <span>{t('img-compress.downloadAllZipCount', { count: doneCount })}</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={handleClearAll}
                    className="text-muted-foreground hover:text-foreground"
                    title={t('img-compress.clearAll')}
                  >
                    <Trash2 />
                    <span>{t('img-compress.clearAll')}</span>
                  </Button>
                </div>
              </div>
            </section>

            {/* Task Item List */}
            <div className="space-y-2 max-h-[calc(100vh-18rem)] overflow-y-auto pr-1">
              {items.map((it) => {
                const isDone = it.status === 'done' && it.result != null
                const itemSavings =
                  isDone
                    ? Math.round(
                        (1 - it.result!.buffer.byteLength / it.file.size) * 100
                      )
                    : 0

                return (
                  <div
                    key={it.id}
                    className="rounded-xl border border-border/70 bg-card p-2.5 shadow-2xs flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={it.previewUrl}
                        alt=""
                        className="h-11 w-11 rounded-lg object-cover bg-muted shrink-0 border border-border/40"
                      />
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-xs font-semibold text-foreground truncate max-w-[200px] sm:max-w-[340px]">
                          {it.file.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-mono tabular-nums">
                          <span>{formatBytes(it.file.size)}</span>
                          {isDone && (
                            <>
                              <span className="text-muted-foreground/60">→</span>
                              <span className="font-semibold text-foreground">
                                {formatBytes(it.result!.buffer.byteLength)}
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {it.status === 'pending' && (
                        <span className="text-[11px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                          {t('img-compress.statusPending')}
                        </span>
                      )}

                      {it.status === 'processing' && (
                        <span className="text-[11px] text-primary flex items-center gap-1 bg-primary/5 px-2 py-0.5 rounded-md">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>{t('img-compress.statusProcessing')}</span>
                        </span>
                      )}

                      {it.status === 'done' && (
                        <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-md tabular-nums">
                          {itemSavings >= 0 ? `−${itemSavings}%` : `+${Math.abs(itemSavings)}%`}
                        </span>
                      )}

                      {it.status === 'error' && (
                        <span className="text-[11px] text-destructive bg-destructive/10 px-2 py-0.5 rounded-md truncate max-w-[140px]">
                          {it.errorMessage ?? t('img-compress.errorFailed')}
                        </span>
                      )}

                      {isDone && (
                        <Button
                          variant="outline"
                          size="icon-xs"
                          onClick={() => handleDownloadItem(it)}
                          title={t('img-compress.download')}
                        >
                          <Download />
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleRemoveItem(it.id)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Append More Button */}
            {items.length < MAX_IMAGES && (
              <button
                type="button"
                onClick={() => appendInputRef.current?.click()}
                className="flex items-center justify-center gap-2 w-full p-3 rounded-xl border border-dashed hover:border-primary/60 hover:bg-muted/30 transition-colors text-xs text-muted-foreground"
              >
                <Plus className="h-4 w-4" />
                <span>{t('img-compress.addMore', { count: MAX_IMAGES - items.length })}</span>
              </button>
            )}
          </div>

          {/* Right: Sticky Global Settings Sidebar */}
          <aside className="lg:sticky lg:top-20 space-y-3">
            <div className="rounded-xl border border-border/80 bg-card shadow-2xs overflow-hidden">
              <CompressSettingsPanel
                outputFormat={outputFormat}
                quality={quality}
                lossless={lossless}
                onFormatChange={handleFormatChange}
                onQualityChange={handleQualityChange}
                onLosslessChange={handleLosslessChange}
              />

              <div className="p-3 bg-muted/10 border-t border-border/60">
                <Button
                  onClick={handleRecompressAll}
                  disabled={isAnyProcessing || items.length === 0}
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5"
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', isAnyProcessing && 'animate-spin')} />
                  <span>{t('img-compress.recompressAll')}</span>
                </Button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </ToolLayout>
  )
}
