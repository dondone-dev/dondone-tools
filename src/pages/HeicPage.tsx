import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Download, ImageOff, Loader2, Upload, X } from 'lucide-react'
import { heicTo, isHeic } from 'heic-to'
import { zipSync } from 'fflate'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { formatBytes } from '@/lib/tools/encoding-common'
import {
  buildOutputFilename,
  encodeBmp,
  getFormatConfig,
  HEIC_FORMATS,
  DEFAULT_QUALITY,
  MAX_CONCURRENT,
  type HeicOutputFormat,
} from '@/lib/tools/heic'
import { cn } from '@/lib/utils'

type ConversionStatus = 'pending' | 'converting' | 'done' | 'error'

interface FileItem {
  id: string
  file: File
  outputName: string
  status: ConversionStatus
  outputBlob?: Blob
  outputSize?: number
  previewUrl?: string
  errorMsgKey?: string
}

let idCounter = 0
function nextId() { return String(++idCounter) }

export function HeicPage() {
  const { t } = useTranslation(['tools', 'common'])
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [format, setFormat] = useState<HeicOutputFormat>('jpeg')
  const [quality, setQuality] = useState(DEFAULT_QUALITY)
  const [items, setItems] = useState<FileItem[]>([])

  const formatRef = useRef(format)
  const qualityRef = useRef(quality)
  const itemsRef = useRef<FileItem[]>([])
  const activeRef = useRef(0)
  const generationRef = useRef(0)
  const pendingQueueRef = useRef<string[]>([])
  const objectUrlsRef = useRef<string[]>([])

  useEffect(() => { formatRef.current = format }, [format])
  useEffect(() => { qualityRef.current = quality }, [quality])

  useEffect(() => {
    return () => { objectUrlsRef.current.forEach(URL.revokeObjectURL) }
  }, [])

  function patchItem(id: string, patch: Partial<FileItem>) {
    setItems(prev => {
      const next = prev.map(i => i.id === id ? { ...i, ...patch } : i)
      itemsRef.current = next
      return next
    })
  }

  function processQueue() {
    while (activeRef.current < MAX_CONCURRENT && pendingQueueRef.current.length > 0) {
      const id = pendingQueueRef.current.shift()!
      startConvert(id, generationRef.current)
    }
  }

  async function startConvert(id: string, generation: number) {
    activeRef.current++
    patchItem(id, { status: 'converting' })

    const item = itemsRef.current.find(i => i.id === id)
    if (!item || item.status === 'error') {
      activeRef.current--
      processQueue()
      return
    }

    const fmt = getFormatConfig(formatRef.current)
    try {
      let blob: Blob
      if (fmt.id === 'bmp') {
        const bitmap = await heicTo({ blob: item.file, type: 'bitmap' }) as ImageBitmap
        const { width, height } = bitmap
        const canvas = new OffscreenCanvas(width, height)
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(bitmap, 0, 0)
        bitmap.close()
        const imgData = ctx.getImageData(0, 0, width, height)
        blob = encodeBmp(imgData.data, width, height)
      } else {
        blob = await heicTo({
          blob: item.file,
          type: fmt.mime as `image/${string}`,
          ...(fmt.supportsQuality && { quality: qualityRef.current / 100 }),
        }) as Blob
      }
      if (generation !== generationRef.current) return
      const previewUrl = URL.createObjectURL(blob)
      objectUrlsRef.current.push(previewUrl)
      patchItem(id, { status: 'done', outputBlob: blob, outputSize: blob.size, previewUrl })
    } catch {
      if (generation !== generationRef.current) return
      patchItem(id, { status: 'error', errorMsgKey: 'heic.conversionFailed' })
    } finally {
      if (generation === generationRef.current) {
        activeRef.current--
        processQueue()
      }
    }
  }

  async function addFiles(fileList: FileList | null) {
    if (!fileList) return
    const files = Array.from(fileList)

    const checked = await Promise.all(
      files.map(async (file) => {
        const valid = await isHeic(file).catch(() => false)
        return { file, valid }
      })
    )

    const newItems: FileItem[] = checked.map(({ file, valid }) => ({
      id: nextId(),
      file,
      outputName: buildOutputFilename(file.name, formatRef.current),
      status: valid ? ('pending' as const) : ('error' as const),
      errorMsgKey: valid ? undefined : 'heic.notHeic',
    }))

    setItems(prev => {
      const next = [...prev, ...newItems]
      itemsRef.current = next
      return next
    })

    const toQueue = newItems.filter(i => i.status === 'pending').map(i => i.id)
    pendingQueueRef.current.push(...toQueue)
    processQueue()
  }

  function reconvertAll() {
    generationRef.current++
    activeRef.current = 0
    pendingQueueRef.current = []

    const next = itemsRef.current.map(i => {
      if (i.status === 'error' && i.errorMsgKey === 'heic.notHeic') return i
      if (i.previewUrl) URL.revokeObjectURL(i.previewUrl)
      return {
        ...i,
        status: 'pending' as const,
        outputBlob: undefined,
        outputSize: undefined,
        previewUrl: undefined,
        outputName: buildOutputFilename(i.file.name, formatRef.current),
      }
    })
    itemsRef.current = next
    setItems(next)

    pendingQueueRef.current = next.filter(i => i.status === 'pending').map(i => i.id)
    processQueue()
  }

  function handleFormatChange(f: HeicOutputFormat) {
    setFormat(f)
    formatRef.current = f
    if (itemsRef.current.length > 0) reconvertAll()
  }

  function handleQualityCommit(value: number[]) {
    qualityRef.current = value[0]
    setQuality(value[0])
    if (itemsRef.current.some(i => i.status === 'done')) reconvertAll()
  }

  function removeItem(id: string) {
    setItems(prev => {
      const item = prev.find(i => i.id === id)
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl)
      pendingQueueRef.current = pendingQueueRef.current.filter(q => q !== id)
      const next = prev.filter(i => i.id !== id)
      itemsRef.current = next
      return next
    })
  }

  function clearAll() {
    generationRef.current++
    pendingQueueRef.current = []
    activeRef.current = 0
    items.forEach(i => { if (i.previewUrl) URL.revokeObjectURL(i.previewUrl) })
    setItems([])
    itemsRef.current = []
  }

  function downloadItem(item: FileItem) {
    if (!item.outputBlob) return
    const url = URL.createObjectURL(item.outputBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = item.outputName
    a.click()
    URL.revokeObjectURL(url)
  }

  async function downloadAll() {
    const done = items.filter(i => i.status === 'done' && i.outputBlob)
    if (!done.length) return

    const entries = await Promise.all(
      done.map(async (item) => ({
        name: item.outputName,
        data: new Uint8Array(await item.outputBlob!.arrayBuffer()),
      }))
    )

    const files: Record<string, Uint8Array> = {}
    for (const { name: rawName, data } of entries) {
      let name = rawName
      if (name in files) {
        const dot = name.lastIndexOf('.')
        const base = dot >= 0 ? name.slice(0, dot) : name
        const ext = dot >= 0 ? name.slice(dot) : ''
        let n = 1
        while (`${base} (${n})${ext}` in files) n++
        name = `${base} (${n})${ext}`
      }
      files[name] = data
    }

    const zipped = zipSync(files)
    const blob = new Blob([zipped], { type: 'application/zip' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'heic-converted.zip'
    a.click()
    URL.revokeObjectURL(url)
  }

  const doneCount = items.filter(i => i.status === 'done').length
  const fmt = getFormatConfig(format)

  return (
    <ToolLayout toolId="heic" category="Image">
      {/* Settings */}
      <div className="flex flex-wrap items-center gap-6">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t('heic.outputFormat', { ns: 'tools' })}</Label>
          <div className="flex gap-1">
            {HEIC_FORMATS.map(f => (
              <button
                key={f.id}
                onClick={() => handleFormatChange(f.id)}
                className={cn(
                  'px-3 py-1 rounded-md text-xs font-medium border transition-colors',
                  format === f.id
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-transparent text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {fmt.supportsQuality && (
          <div className="space-y-1.5 min-w-40 flex-1 max-w-56">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">{t('heic.quality', { ns: 'tools' })}</Label>
              <span className="text-xs font-mono text-muted-foreground">{quality}%</span>
            </div>
            <Slider
              value={[quality]}
              onValueChange={([v]) => setQuality(v)}
              onValueCommit={handleQualityCommit}
              min={10}
              max={100}
              step={1}
            />
          </div>
        )}
      </div>

      {/* Drop zone */}
      <input
        ref={inputRef}
        type="file"
        accept=".heic,.heif,image/heic,image/heif"
        multiple
        className="hidden"
        onChange={(e) => { addFiles(e.target.files); e.target.value = '' }}
      />
      <div
        role="button"
        tabIndex={0}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          dragOver ? 'border-foreground/50 bg-muted/50' : 'border-border hover:border-foreground/30'
        )}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files) }}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click() } }}
      >
        <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t('heic.dropFiles', { ns: 'tools' })}</p>
        <p className="text-xs text-muted-foreground/60 mt-1">{t('heic.multipleHint', { ns: 'tools' })}</p>
      </div>

      {/* File list */}
      {items.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {t('heic.filesCount', { ns: 'tools', count: items.length })}
            </span>
            <div className="flex gap-2">
              {doneCount >= 2 && (
                <Button variant="outline" size="sm" className="h-7 px-2 gap-1 text-xs" onClick={downloadAll}>
                  <Download className="h-3 w-3" />
                  {t('heic.downloadAll', { ns: 'tools' })}
                </Button>
              )}
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" onClick={clearAll}>
                {t('heic.clearAll', { ns: 'tools' })}
              </Button>
            </div>
          </div>

          <div className="border rounded-md divide-y">
            {items.map(item => (
              <FileRow
                key={item.id}
                item={item}
                onDownload={() => downloadItem(item)}
                onRemove={() => removeItem(item.id)}
                t={t}
              />
            ))}
          </div>
        </div>
      )}
    </ToolLayout>
  )
}

interface FileRowProps {
  item: FileItem
  onDownload: () => void
  onRemove: () => void
  t: ReturnType<typeof useTranslation>['t']
}

function FileRow({ item, onDownload, onRemove, t }: FileRowProps) {
  return (
    <div className="flex items-center gap-3 px-3 py-2">
      {/* Thumbnail / status icon */}
      <div className="w-10 h-10 rounded flex-shrink-0 overflow-hidden bg-muted/40 flex items-center justify-center">
        {item.status === 'done' && item.previewUrl ? (
          <img src={item.previewUrl} alt="" className="w-full h-full object-cover" />
        ) : item.status === 'converting' ? (
          <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
        ) : item.status === 'error' ? (
          <ImageOff className="h-4 w-4 text-destructive" />
        ) : (
          <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
        )}
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{item.file.name}</p>
        <p className="text-xs text-muted-foreground">
          {formatBytes(item.file.size)}
          {item.outputSize != null && (
            <> → <span className="text-foreground/70">{formatBytes(item.outputSize)}</span></>
          )}
          {item.status === 'error' && item.errorMsgKey && (
            <span className="text-destructive ml-1">· {t(item.errorMsgKey, { ns: 'tools' })}</span>
          )}
        </p>
      </div>

      {/* Status badge */}
      <StatusBadge status={item.status} t={t} />

      {/* Actions */}
      {item.status === 'done' && (
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onDownload} aria-label={t('heic.download', { ns: 'tools' })}>
          <Download className="h-3.5 w-3.5" />
        </Button>
      )}
      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground/50 hover:text-muted-foreground" onClick={onRemove} aria-label={t('heic.remove', { ns: 'tools' })}>
        <X className="h-3 w-3" />
      </Button>
    </div>
  )
}

function StatusBadge({ status, t }: { status: ConversionStatus; t: FileRowProps['t'] }) {
  if (status === 'done') {
    return (
      <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
        <Check className="h-3 w-3" />
        {t('heic.done', { ns: 'tools' })}
      </span>
    )
  }
  if (status === 'converting') {
    return <span className="text-xs text-muted-foreground">{t('heic.converting', { ns: 'tools' })}</span>
  }
  if (status === 'error') {
    return null
  }
  return <span className="text-xs text-muted-foreground/50">{t('heic.pending', { ns: 'tools' })}</span>
}
