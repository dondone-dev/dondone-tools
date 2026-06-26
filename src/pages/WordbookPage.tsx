import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Copy, Download, Loader2, Printer } from 'lucide-react'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useClipboard } from '@/hooks/useClipboard'

interface WordbookMeta {
  id: string
  nameKey: string
  count: number
  load: () => Promise<string[]>
}

const WORDBOOKS: WordbookMeta[] = [
  {
    id: 'cs-1',
    nameKey: 'wordbook.books.cs1',
    count: 750,
    load: () =>
      import('@/lib/data/wordbooks/cs-1.json').then((m) => m.default as string[]),
  },
  {
    id: 'cs-2',
    nameKey: 'wordbook.books.cs2',
    count: 530,
    load: () =>
      import('@/lib/data/wordbooks/cs-2.json').then((m) => m.default as string[]),
  },
  {
    id: 'cs-3',
    nameKey: 'wordbook.books.cs3',
    count: 523,
    load: () =>
      import('@/lib/data/wordbooks/cs-3.json').then((m) => m.default as string[]),
  },
]

const PRINT_STYLES = `
@media print {
  header, footer { display: none !important; }
  .wordbook-controls { display: none !important; }
  .wordbook-list-wrapper {
    max-height: none !important;
    overflow: visible !important;
    border: none !important;
    border-radius: 0 !important;
    padding: 0 !important;
  }
  .wordbook-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    gap: 0 !important;
  }
  .wordbook-grid > div {
    padding: 2px 4px !important;
    border-radius: 0 !important;
  }
  .wordbook-grid > div:hover {
    background: none !important;
  }
  .wordbook-print-header { display: block !important; }
  @page { margin: 16mm 14mm; }
}
`

export function WordbookPage() {
  const { t } = useTranslation(['tools', 'common'])
  const { copiedText, copy } = useClipboard()

  const [selectedId, setSelectedId] = useState(WORDBOOKS[0].id)
  const [words, setWords] = useState<string[] | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const book = WORDBOOKS.find((b) => b.id === selectedId)
    if (!book) return
    setWords(null)
    setLoading(true)
    book
      .load()
      .then((w) => setWords(w))
      .finally(() => setLoading(false))
  }, [selectedId])

  const wordText = useMemo(
    () => words?.join('\n') ?? '',
    [words],
  )

  function handleCopy() {
    copy(wordText)
  }

  function handleDownload() {
    const blob = new Blob([wordText], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedId}-words.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handlePrint() {
    window.print()
  }

  const isCopied = !!copiedText
  const currentBook = WORDBOOKS.find((b) => b.id === selectedId)

  return (
    <ToolLayout toolId="wordbook" category="Text">
      <style>{PRINT_STYLES}</style>

      <div className="wordbook-controls flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="flex items-center gap-3">
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="w-64" aria-label={t('wordbook.selectBook', { ns: 'tools' })}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WORDBOOKS.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {t(b.nameKey, { ns: 'tools' })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-sm text-muted-foreground shrink-0">
            {t('wordbook.wordCount', { ns: 'tools', count: currentBook?.count ?? 0 })}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            disabled={!words || loading}
            className="gap-1.5"
          >
            {isCopied ? (
              <Check className="h-3.5 w-3.5 text-green-600" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {isCopied
              ? t('wordbook.copied', { ns: 'tools' })
              : t('wordbook.copyAll', { ns: 'tools' })}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={!words || loading}
            className="gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            {t('wordbook.download', { ns: 'tools' })}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            disabled={!words || loading}
            className="gap-1.5"
          >
            <Printer className="h-3.5 w-3.5" />
            {t('wordbook.exportPdf', { ns: 'tools' })}
          </Button>
        </div>
      </div>

      {/* Print-only header — hidden on screen */}
      <div className="wordbook-print-header hidden">
        <h2 className="text-base font-semibold mb-1">
          {currentBook ? t(currentBook.nameKey, { ns: 'tools' }) : ''}
        </h2>
        <p className="text-xs text-gray-500 mb-3">
          {t('wordbook.wordCount', { ns: 'tools', count: words?.length ?? 0 })}
        </p>
      </div>

      <div className="border rounded-lg overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{t('wordbook.loading', { ns: 'tools' })}</span>
          </div>
        )}

        {words && !loading && (
          <div className="wordbook-list-wrapper max-h-[640px] overflow-y-auto p-3">
            <div
              className="wordbook-grid grid gap-0.5"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}
            >
              {words.map((word, i) => (
                <div
                  key={i}
                  className="flex items-baseline gap-2 px-2 py-1 rounded hover:bg-muted/60 transition-colors"
                >
                  <span className="text-xs text-muted-foreground tabular-nums w-8 text-right shrink-0">
                    {i + 1}.
                  </span>
                  <span className="font-mono text-sm truncate">{word}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  )
}
