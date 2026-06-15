import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  File,
  FileArchive,
  Folder,
  Loader2,
  Search,
  X,
} from 'lucide-react'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  formatBytes,
  getVisibleEntries,
  parseZip,
  MAX_BYTES,
  WARN_BYTES,
  type ParsedZip,
  type ZipEntry,
} from '@/lib/tools/zip-inspector'

const PAGE_SIZE = 300

export function ZipInspectorPage() {
  const { t } = useTranslation(['tools', 'common'])
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ParsedZip | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [warn, setWarn] = useState('')
  const [filter, setFilter] = useState('')
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())
  const [showAll, setShowAll] = useState(false)

  const handleFile = useCallback(
    async (f: File) => {
      setError('')
      setWarn('')
      setResult(null)
      setFilter('')
      setShowAll(false)

      const isZip =
        f.name.toLowerCase().endsWith('.zip') ||
        f.type === 'application/zip' ||
        f.type === 'application/x-zip-compressed'

      if (!isZip) {
        setError(t('zip-inspector.zipOnly', { ns: 'tools' }))
        return
      }

      if (f.size > MAX_BYTES) {
        setError(t('zip-inspector.fileTooLarge', { ns: 'tools' }))
        return
      }

      if (f.size > WARN_BYTES) {
        setWarn(t('zip-inspector.sizeWarning', { ns: 'tools', size: formatBytes(f.size) }))
      }

      setFile(f)
      setLoading(true)
      try {
        const parsed = await parseZip(f)
        setExpandedDirs(new Set(parsed.entries.filter(e => e.isDir).map(e => e.path)))
        setResult(parsed)
      } catch {
        setError(t('zip-inspector.loadFailed', { ns: 'tools' }))
        setFile(null)
      } finally {
        setLoading(false)
      }
    },
    [t],
  )

  function handleFiles(files: FileList | null) {
    const f = files?.[0]
    if (f) handleFile(f)
  }

  function clearFile() {
    setFile(null)
    setResult(null)
    setError('')
    setWarn('')
    setFilter('')
    if (inputRef.current) inputRef.current.value = ''
  }

  function toggleDir(path: string) {
    setExpandedDirs(prev => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const visibleEntries = result ? getVisibleEntries(result.entries, expandedDirs, filter) : []
  const displayedEntries = showAll ? visibleEntries : visibleEntries.slice(0, PAGE_SIZE)
  const hasMore = visibleEntries.length > PAGE_SIZE && !showAll

  return (
    <ToolLayout toolId="zip-inspector" category="File">
      <input
        ref={inputRef}
        type="file"
        accept=".zip"
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />

      {!file && (
        <div
          role="button"
          tabIndex={0}
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
            dragOver
              ? 'border-foreground/50 bg-muted/50'
              : 'border-border hover:border-foreground/30 focus-visible:border-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          )}
          onDragOver={e => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault()
            setDragOver(false)
            handleFiles(e.dataTransfer.files)
          }}
          onClick={() => inputRef.current?.click()}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              inputRef.current?.click()
            }
          }}
        >
          <FileArchive className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t('zip-inspector.dropFile', { ns: 'tools' })}</p>
          <p className="text-xs text-muted-foreground/60 mt-1">{t('zip-inspector.hint', { ns: 'tools', maxSize: formatBytes(MAX_BYTES) })}</p>
        </div>
      )}

      {file && (
        <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted/30 text-sm">
          <FileArchive className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="flex-1 truncate font-mono text-xs">{file.name}</span>
          <span className="text-xs text-muted-foreground shrink-0">{formatBytes(file.size)}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            onClick={clearFile}
            aria-label={t('zip-inspector.clear', { ns: 'tools' })}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{t('zip-inspector.parsing', { ns: 'tools' })}</span>
        </div>
      )}

      {warn && !loading && (
        <p className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 px-3 py-2 rounded-md">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {warn}
        </p>
      )}

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
      )}

      {result && !loading && (
        <>
          <section className="border rounded-md overflow-hidden">
            <div className="px-3 py-2 bg-muted/40 border-b">
              <span className="text-xs font-medium">{t('zip-inspector.summary', { ns: 'tools' })}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border">
              <SummaryCell label={t('zip-inspector.files', { ns: 'tools' })} value={result.fileCount.toLocaleString()} />
              <SummaryCell label={t('zip-inspector.folders', { ns: 'tools' })} value={result.dirCount.toLocaleString()} />
              <SummaryCell label={t('zip-inspector.totalSize', { ns: 'tools' })} value={formatBytes(result.totalSize)} />
              <SummaryCell
                label={t('zip-inspector.compressedSize', { ns: 'tools' })}
                value={`${formatBytes(result.totalCompressedSize)} (${result.overallRatio}%)`}
              />
            </div>
          </section>

          <section className="border rounded-md overflow-hidden">
            <div className="px-3 py-2 bg-muted/40 border-b flex items-center justify-between gap-3">
              <span className="text-xs font-medium shrink-0">
                {t('zip-inspector.contents', { ns: 'tools' })}
              </span>
              <div className="relative flex-1 max-w-56">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={filter}
                  onChange={e => {
                    setFilter(e.target.value)
                    setShowAll(false)
                  }}
                  placeholder={t('zip-inspector.filter', { ns: 'tools' })}
                  className="w-full pl-7 pr-2 py-1 text-xs bg-background border rounded-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            <div className="grid grid-cols-[1fr_5rem_3rem] sm:grid-cols-[1fr_5rem_5rem_3rem] gap-1 px-3 py-1.5 bg-muted/20 border-b text-xs text-muted-foreground font-medium">
              <span>{t('zip-inspector.colName', { ns: 'tools' })}</span>
              <span className="text-right">{t('zip-inspector.colSize', { ns: 'tools' })}</span>
              <span className="text-right hidden sm:block">{t('zip-inspector.colCompressed', { ns: 'tools' })}</span>
              <span className="text-right">{t('zip-inspector.colRatio', { ns: 'tools' })}</span>
            </div>

            <div className="divide-y max-h-[480px] overflow-y-auto">
              {displayedEntries.length === 0 ? (
                <p className="px-3 py-4 text-xs text-muted-foreground text-center">
                  {t('zip-inspector.noMatch', { ns: 'tools' })}
                </p>
              ) : (
                displayedEntries.map(e => (
                  <EntryRow
                    key={e.path}
                    entry={e}
                    expanded={expandedDirs.has(e.path)}
                    onToggle={toggleDir}
                    filterActive={!!filter}
                  />
                ))
              )}
            </div>

            {hasMore && (
              <div className="px-3 py-2 border-t text-center">
                <button
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowAll(true)}
                >
                  {t('zip-inspector.showAll', { ns: 'tools', count: visibleEntries.length })}
                </button>
              </div>
            )}
          </section>
        </>
      )}
    </ToolLayout>
  )
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-2.5 bg-background">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium mt-0.5">{value}</p>
    </div>
  )
}

function EntryRow({
  entry,
  expanded,
  onToggle,
  filterActive,
}: {
  entry: ZipEntry
  expanded: boolean
  onToggle: (path: string) => void
  filterActive: boolean
}) {
  const isClickable = entry.isDir && !filterActive
  return (
    <div
      className={cn(
        'grid grid-cols-[1fr_5rem_3rem] sm:grid-cols-[1fr_5rem_5rem_3rem] gap-1 py-1 text-xs items-center pr-3',
        isClickable && 'cursor-pointer hover:bg-muted/30',
      )}
      style={{ paddingLeft: `${12 + entry.depth * 16}px` }}
      onClick={() => isClickable && onToggle(entry.path)}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        {isClickable ? (
          expanded ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
          )
        ) : (
          <span className="h-3 w-3 shrink-0" />
        )}
        {entry.isDir ? (
          <Folder className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <File className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
        <span className={cn('truncate', entry.isDir && 'font-medium')} title={entry.path}>
          {entry.name}
        </span>
      </div>
      <span className="text-right text-muted-foreground">
        {entry.isDir ? '—' : formatBytes(entry.size)}
      </span>
      <span className="text-right text-muted-foreground hidden sm:block">
        {entry.isDir ? '—' : formatBytes(entry.compressedSize)}
      </span>
      <span className="text-right text-muted-foreground">
        {entry.isDir || entry.ratio === 0 ? '—' : `${entry.ratio}%`}
      </span>
    </div>
  )
}
